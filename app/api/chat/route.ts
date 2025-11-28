import { GoogleGenAI, FunctionCallingConfigMode } from '@google/genai';
import type { Content, Part, FunctionDeclaration } from '@google/genai';
import { NextRequest } from 'next/server';
import { mcpClientManager } from '@/lib/mcp/client-manager';
import { uploadChatImages } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 재시도 설정
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1초

// 지수 백오프 딜레이 함수
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 재시도 가능한 에러인지 확인
function isRetryableError(error: unknown): boolean {
  const errorStr = error instanceof Error ? error.message : String(error);
  return errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED');
}

const SYSTEM_PROMPT = `
당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 명확하고 친절하게 답변하세요.

답변이 끝난 후에는 반드시 사용자가 흥미를 느낄만한 후속 질문 3개를 제안해야 합니다.
후속 질문은 다음과 같은 형식을 따라야 합니다:

[답변 내용]

---FOLLOWUP---
["질문 1", "질문 2", "질문 3"]

주의사항:
1. ---FOLLOWUP--- 구분자는 반드시 답변과 분리되어야 합니다.
2. 후속 질문은 반드시 유효한 JSON 배열 포맷이어야 합니다.
3. 후속 질문은 답변 내용과 밀접하게 관련되어야 합니다.
`;

const SYSTEM_PROMPT_WITH_TOOLS = `
당신은 도움이 되는 AI 어시스턴트입니다. 사용자의 질문에 명확하고 친절하게 답변하세요.

중요: 사용 가능한 도구(function)가 있으면 반드시 사용하세요!
- 날짜, 시간 관련 질문에는 시간 관련 도구를 호출하세요.
- 이미지 생성 요청에는 이미지 생성 도구를 호출하세요.
- 도구를 호출한 후 그 결과를 바탕으로 답변하세요.
- "도구를 사용할 수 없다"고 말하지 마세요. 도구가 있으면 반드시 사용하세요.

답변이 끝난 후에는 반드시 사용자가 흥미를 느낄만한 후속 질문 3개를 제안해야 합니다.
후속 질문은 다음과 같은 형식을 따라야 합니다:

[답변 내용]

---FOLLOWUP---
["질문 1", "질문 2", "질문 3"]
`;

interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

interface ImageData {
  type: string;
  data: string;
  mimeType?: string;
}

// MCP 도구 결과에서 이미지 추출
function extractImagesFromToolResult(content: unknown): ImageData[] {
  const images: ImageData[] = [];
  
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item && typeof item === 'object' && 'type' in item) {
        if (item.type === 'image' && 'data' in item) {
          images.push({
            type: 'image',
            data: item.data as string,
            mimeType: (item as { mimeType?: string }).mimeType || 'image/webp'
          });
        }
      }
    }
  }
  
  return images;
}

interface MCPToolSchema {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

// MCP 도구 스키마를 Gemini FunctionDeclaration으로 변환
function mcpToolToFunctionDeclaration(tool: MCPToolSchema): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema ? {
      type: tool.inputSchema.type as 'object',
      properties: tool.inputSchema.properties || {},
      required: tool.inputSchema.required || []
    } : undefined
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { 
      message, 
      history, 
      model = 'gemini-2.0-flash-001',
      enabledMcpServers = [] 
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '메시지가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // MCP 도구 스키마 수집
    const functionDeclarations: FunctionDeclaration[] = [];
    const serverToolMap: Map<string, string> = new Map(); // toolName -> serverId
    
    if (enabledMcpServers.length > 0) {
      const connectedClients = mcpClientManager.getConnectedClients();
      
      for (const { serverId, client } of connectedClients) {
        if (enabledMcpServers.includes(serverId)) {
          try {
            // MCP 서버에서 도구 목록 가져오기
            const toolsResult = await client.listTools();
            console.log(`[MCP] Server ${serverId} tools:`, toolsResult.tools?.length || 0);
            
            if (toolsResult.tools) {
              for (const tool of toolsResult.tools) {
                const funcDecl = mcpToolToFunctionDeclaration(tool as MCPToolSchema);
                functionDeclarations.push(funcDecl);
                serverToolMap.set(tool.name, serverId);
                console.log(`[MCP] Registered tool: ${tool.name} from server ${serverId}`);
              }
            }
          } catch (error) {
            console.error(`[MCP] Failed to list tools from ${serverId}:`, error);
          }
        }
      }
    }

    // 이전 대화 내용을 history로 전달 (텍스트만 포함, functionCall/Response 제외)
    // Gemini API는 functionResponse 형식에 민감하므로 이전 대화는 텍스트만 전달
    const formattedHistory: Content[] = Array.isArray(history) 
      ? history
          .filter((msg: { role: string; text?: string }) => msg.text && msg.text.trim().length > 0)
          .map((msg: { role: string; text: string }) => ({
            role: msg.role === 'model' ? 'model' as const : 'user' as const,
            parts: [{ text: msg.text }]
          }))
      : [];

    const encoder = new TextEncoder();
    
    // MCP 도구가 활성화된 경우 - 수동 함수 호출 루프
    if (functionDeclarations.length > 0) {
      const toolCalls: ToolCallInfo[] = [];
      const generatedImageUrls: string[] = []; // 생성된 이미지 URL 수집
      
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            console.log('[MCP Chat] Starting with', functionDeclarations.length, 'tools');
            
            // Tool call 시작 알림
            controller.enqueue(encoder.encode('---TOOLCALL_START---\n'));
            
            // 현재 대화 내용 구성
            const contents: Content[] = [
              ...formattedHistory,
              { role: 'user' as const, parts: [{ text: message }] }
            ];
            
            // 최대 5번까지 함수 호출 루프 실행
            const MAX_ITERATIONS = 5;
            let finalText = '';
            
            for (let i = 0; i < MAX_ITERATIONS; i++) {
              console.log(`[MCP Chat] Iteration ${i + 1}`);
              
              // 재시도 로직이 포함된 API 호출
              let response;
              let lastError: unknown;
              
              for (let retry = 0; retry < MAX_RETRIES; retry++) {
                try {
                  response = await ai.models.generateContent({
                    model,
                    contents,
                    config: {
                      systemInstruction: SYSTEM_PROMPT_WITH_TOOLS,
                      tools: [{ functionDeclarations }],
                      toolConfig: {
                        functionCallingConfig: {
                          mode: FunctionCallingConfigMode.AUTO
                        }
                      }
                    }
                  });
                  break; // 성공하면 루프 탈출
                } catch (error) {
                  lastError = error;
                  if (isRetryableError(error) && retry < MAX_RETRIES - 1) {
                    const delay = INITIAL_RETRY_DELAY * Math.pow(2, retry);
                    console.log(`[MCP Chat] Rate limited, retrying in ${delay}ms (attempt ${retry + 2}/${MAX_RETRIES})`);
                    await sleep(delay);
                  } else {
                    throw error; // 재시도 불가능한 에러거나 재시도 횟수 초과
                  }
                }
              }
              
              if (!response) {
                throw lastError || new Error('API 호출 실패');
              }
              
              const candidate = response.candidates?.[0];
              if (!candidate?.content?.parts) {
                console.log('[MCP Chat] No content parts in response');
                finalText = response.text || '응답을 생성할 수 없습니다.';
                break;
              }
              
              const parts = candidate.content.parts;
              let hasFunctionCall = false;
              const functionCallParts: Part[] = [];
              const functionResponseParts: Part[] = [];
              
              // 응답에서 함수 호출 확인
              for (const part of parts) {
                if ('functionCall' in part && part.functionCall) {
                  hasFunctionCall = true;
                  const fc = part.functionCall;
                  console.log(`[MCP Chat] Function call: ${fc.name}`, fc.args);
                  
                  const serverId = serverToolMap.get(fc.name || '');
                  if (!serverId) {
                    console.error(`[MCP Chat] Unknown tool: ${fc.name}`);
                    continue;
                  }
                  
                  // MCP 서버에서 도구 실행
                  try {
                    const client = mcpClientManager.getClient(serverId);
                    const result = await client.callTool({
                      name: fc.name || '',
                      arguments: fc.args as Record<string, unknown> || {}
                    });
                    
                    console.log(`[MCP Chat] Tool result:`, JSON.stringify(result).substring(0, 200));
                    
                    // 이미지 추출 및 업로드
                    const extractedImages = extractImagesFromToolResult(result.content);
                    if (extractedImages.length > 0) {
                      console.log(`[MCP Chat] Found ${extractedImages.length} images, uploading to Supabase...`);
                      const uploadedUrls = await uploadChatImages(extractedImages);
                      generatedImageUrls.push(...uploadedUrls);
                      console.log(`[MCP Chat] Uploaded ${uploadedUrls.length} images:`, uploadedUrls);
                    }
                    
                    toolCalls.push({
                      name: fc.name || 'unknown',
                      args: fc.args as Record<string, unknown> || {},
                      result: result.content
                    });
                    
                    functionCallParts.push({ functionCall: fc });
                    
                    // functionResponse의 response는 객체여야 함 (이미지 데이터 제외, URL만 포함)
                    let responseForModel: Record<string, unknown>;
                    if (extractedImages.length > 0) {
                      // 이미지가 있으면 URL 정보만 전달
                      responseForModel = { 
                        success: true, 
                        message: '이미지가 생성되었습니다.',
                        imageUrls: generatedImageUrls.slice(-extractedImages.length)
                      };
                    } else if (Array.isArray(result.content)) {
                      responseForModel = { result: result.content };
                    } else if (typeof result.content === 'object') {
                      responseForModel = result.content as Record<string, unknown>;
                    } else {
                      responseForModel = { result: result.content };
                    }
                    
                    functionResponseParts.push({
                      functionResponse: {
                        name: fc.name || '',
                        response: responseForModel
                      }
                    });
                  } catch (error) {
                    console.error(`[MCP Chat] Tool execution error:`, error);
                    toolCalls.push({
                      name: fc.name || 'unknown',
                      args: fc.args as Record<string, unknown> || {},
                      error: error instanceof Error ? error.message : '도구 실행 실패'
                    });
                    
                    functionCallParts.push({ functionCall: fc });
                    functionResponseParts.push({
                      functionResponse: {
                        name: fc.name || '',
                        response: { error: String(error instanceof Error ? error.message : '도구 실행 실패') }
                      }
                    });
                  }
                }
                
                if ('text' in part && part.text) {
                  finalText += part.text;
                }
              }
              
              // 함수 호출이 있으면 결과를 추가하고 계속
              if (hasFunctionCall && functionResponseParts.length > 0) {
                // 모델의 함수 호출 응답 추가
                contents.push({
                  role: 'model' as const,
                  parts: functionCallParts
                });
                
                // 함수 실행 결과 추가
                contents.push({
                  role: 'user' as const,
                  parts: functionResponseParts
                });
                
                // Tool call 정보 중간 전송
                controller.enqueue(encoder.encode(JSON.stringify({ toolCalls }) + '\n'));
              } else {
                // 함수 호출이 없으면 루프 종료
                if (!finalText) {
                  finalText = response.text || '응답을 생성할 수 없습니다.';
                }
                break;
              }
            }
            
            controller.enqueue(encoder.encode('---TOOLCALL_END---\n'));
            
            // 이미지 URL이 있으면 전송
            if (generatedImageUrls.length > 0) {
              controller.enqueue(encoder.encode('---IMAGES---\n'));
              controller.enqueue(encoder.encode(JSON.stringify(generatedImageUrls) + '\n'));
            }
            
            controller.enqueue(encoder.encode(finalText));
            controller.close();
          } catch (error) {
            console.error('[MCP Chat] Error:', error);
            controller.enqueue(encoder.encode('---TOOLCALL_END---\n'));
            
            // 오류 메시지 친절하게 변환
            let errorMessage = '알 수 없는 오류가 발생했습니다.';
            const errorStr = error instanceof Error ? error.message : String(error);
            
            if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
              errorMessage = '⚠️ API 요청 한도에 도달했습니다. 잠시 후(1-2분) 다시 시도해주세요.';
            } else if (errorStr.includes('400') || errorStr.includes('INVALID')) {
              errorMessage = '요청 형식에 문제가 있습니다. 다시 시도해주세요.';
            } else {
              errorMessage = `오류가 발생했습니다: ${errorStr}`;
            }
            
            controller.enqueue(encoder.encode(errorMessage));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // MCP 도구가 비활성화된 경우 - 기존 스트리밍 로직 사용
    const chat = ai.chats.create({ 
      model,
      history: formattedHistory,
      config: {
        systemInstruction: SYSTEM_PROMPT
      }
    });

    // 재시도 로직이 포함된 스트리밍 호출
    let stream;
    let lastStreamError: unknown;
    
    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      try {
        stream = await chat.sendMessageStream({ message });
        break;
      } catch (error) {
        lastStreamError = error;
        if (isRetryableError(error) && retry < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retry);
          console.log(`[Chat] Rate limited, retrying in ${delay}ms (attempt ${retry + 2}/${MAX_RETRIES})`);
          await sleep(delay);
        } else {
          throw error;
        }
      }
    }
    
    if (!stream) {
      throw lastStreamError || new Error('스트리밍 시작 실패');
    }

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: '채팅 요청 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

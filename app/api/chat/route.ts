import { GoogleGenAI } from '@google/genai';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, history, model = 'gemini-2.0-flash-001' } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '메시지가 필요합니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // 이전 대화 내용을 history로 전달
    const formattedHistory = Array.isArray(history) ? history.map((msg: any) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    })) : [];

    const chat = ai.chats.create({ 
      model,
      history: formattedHistory,
      config: {
        systemInstruction: SYSTEM_PROMPT
      }
    });

    const stream = await chat.sendMessageStream({ message });

    const encoder = new TextEncoder();
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

import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp/client-manager';
import type { ListPromptsResponse, GetPromptResponse } from '@/lib/mcp/types';

export const runtime = 'nodejs';

// Prompts 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse<ListPromptsResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    
    console.log('[API Prompts] Request for serverId:', serverId);
    console.log('[API Prompts] All connected servers:', mcpClientManager.getStatus());

    if (!serverId) {
      return NextResponse.json(
        { error: 'serverId가 필요합니다.' },
        { status: 400 }
      );
    }

    const isConnected = mcpClientManager.isConnected(serverId);
    console.log('[API Prompts] isConnected:', isConnected);
    
    if (!isConnected) {
      return NextResponse.json(
        { error: '서버에 연결되어 있지 않습니다.' },
        { status: 400 }
      );
    }

    const prompts = await mcpClientManager.listPrompts(serverId);
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('MCP listPrompts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Prompts 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Prompt 실행
export async function POST(request: NextRequest): Promise<NextResponse<GetPromptResponse | { error: string }>> {
  try {
    const body = await request.json();
    const { serverId, name, arguments: args } = body;

    if (!serverId || !name) {
      return NextResponse.json(
        { error: 'serverId와 name이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: '서버에 연결되어 있지 않습니다.' },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.getPrompt(serverId, name, args);
    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP getPrompt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Prompt 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


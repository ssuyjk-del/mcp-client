import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp/client-manager';
import type { ListToolsResponse, CallToolResponse } from '@/lib/mcp/types';

export const runtime = 'nodejs';

// Tools 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse<ListToolsResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');

    if (!serverId) {
      return NextResponse.json(
        { error: 'serverId가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: '서버에 연결되어 있지 않습니다.' },
        { status: 400 }
      );
    }

    const tools = await mcpClientManager.listTools(serverId);
    return NextResponse.json({ tools });
  } catch (error) {
    console.error('MCP listTools error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tools 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Tool 실행
export async function POST(request: NextRequest): Promise<NextResponse<CallToolResponse | { error: string }>> {
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

    const result = await mcpClientManager.callTool(serverId, name, args);
    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP callTool error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tool 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


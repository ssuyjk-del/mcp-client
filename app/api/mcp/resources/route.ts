import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp/client-manager';
import type { ListResourcesResponse, ReadResourceResponse } from '@/lib/mcp/types';

export const runtime = 'nodejs';

// Resources 목록 조회
export async function GET(request: NextRequest): Promise<NextResponse<ListResourcesResponse | { error: string }>> {
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

    const resources = await mcpClientManager.listResources(serverId);
    return NextResponse.json({ resources });
  } catch (error) {
    console.error('MCP listResources error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Resources 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Resource 읽기
export async function POST(request: NextRequest): Promise<NextResponse<ReadResourceResponse | { error: string }>> {
  try {
    const body = await request.json();
    const { serverId, uri } = body;

    if (!serverId || !uri) {
      return NextResponse.json(
        { error: 'serverId와 uri가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: '서버에 연결되어 있지 않습니다.' },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.readResource(serverId, uri);
    return NextResponse.json(result);
  } catch (error) {
    console.error('MCP readResource error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Resource 읽기 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


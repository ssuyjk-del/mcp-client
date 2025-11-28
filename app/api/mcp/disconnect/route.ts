import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp/client-manager';
import type { DisconnectResponse } from '@/lib/mcp/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse<DisconnectResponse>> {
  try {
    const body = await request.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        { success: false, error: 'serverId가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.disconnect(serverId);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('MCP disconnect error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '연결 해제 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}


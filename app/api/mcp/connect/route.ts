import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp/client-manager';
import type { MCPServerConfig, ConnectResponse } from '@/lib/mcp/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse<ConnectResponse>> {
  try {
    const body = await request.json();
    const config: MCPServerConfig = body.config;

    console.log('[API] Connect request received:', config?.name, config?.transport);

    if (!config || !config.id || !config.name || !config.transport) {
      console.log('[API] Invalid config');
      return NextResponse.json(
        { success: false, serverId: '', error: '유효하지 않은 서버 설정입니다.' },
        { status: 400 }
      );
    }

    // Transport 타입별 필수 필드 검증
    if (config.transport === 'stdio' && !config.command) {
      console.log('[API] Missing command for stdio');
      return NextResponse.json(
        { success: false, serverId: config.id, error: 'STDIO transport에는 command가 필요합니다.' },
        { status: 400 }
      );
    }

    if ((config.transport === 'streamable-http' || config.transport === 'sse') && !config.url) {
      console.log('[API] Missing URL for HTTP/SSE');
      return NextResponse.json(
        { success: false, serverId: config.id, error: 'HTTP/SSE transport에는 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    const result = await mcpClientManager.connect(config);
    console.log('[API] Connect result:', result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        serverId: config.id,
      });
    } else {
      // 연결 실패해도 200 반환하여 클라이언트에서 에러 메시지 확인 가능
      return NextResponse.json({
        success: false,
        serverId: config.id,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('[API] MCP connect error:', error);
    return NextResponse.json(
      { 
        success: false, 
        serverId: '', 
        error: error instanceof Error ? error.message : '연결 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}


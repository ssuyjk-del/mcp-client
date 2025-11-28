import { NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp/client-manager';
import type { StatusResponse } from '@/lib/mcp/types';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse<StatusResponse>> {
  try {
    const servers = mcpClientManager.getStatus();
    return NextResponse.json({ servers });
  } catch (error) {
    console.error('MCP status error:', error);
    return NextResponse.json(
      { servers: [] },
      { status: 500 }
    );
  }
}


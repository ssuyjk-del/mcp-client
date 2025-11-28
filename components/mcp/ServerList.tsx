'use client';

import { Server, Wifi, WifiOff, Loader2, Trash2, Edit2 } from 'lucide-react';
import type { MCPServerConfig, MCPServerStatus } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';

interface ServerListProps {
  servers: MCPServerConfig[];
  serverStatuses: Record<string, MCPServerStatus>;
  selectedServerId: string | null;
  onSelect: (serverId: string) => void;
  onConnect: (serverId: string) => Promise<void>;
  onDisconnect: (serverId: string) => Promise<void>;
  onEdit: (server: MCPServerConfig) => void;
  onDelete: (serverId: string) => Promise<void>;
  isLoading: boolean;
}

export default function ServerList({
  servers,
  serverStatuses,
  selectedServerId,
  onSelect,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  isLoading,
}: ServerListProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected':
        return 'text-emerald-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-zinc-500';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const getTransportBadge = (transport: string) => {
    const colors: Record<string, string> = {
      'stdio': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'streamable-http': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'sse': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    
    const labels: Record<string, string> = {
      'stdio': 'STDIO',
      'streamable-http': 'HTTP',
      'sse': 'SSE',
    };

    return (
      <span className={cn("px-2 py-0.5 text-xs rounded border", colors[transport] || 'bg-zinc-700 text-zinc-400')}>
        {labels[transport] || transport}
      </span>
    );
  };

  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>등록된 MCP 서버가 없습니다.</p>
        <p className="text-sm mt-1">새 서버를 추가해보세요.</p>
        <div className="mt-4 text-left text-xs bg-zinc-800/50 p-4 rounded-lg max-w-md mx-auto">
          <p className="font-medium text-zinc-400 mb-2">MCP 서버 예시:</p>
          <ul className="space-y-1 text-zinc-500">
            <li>• STDIO: npx -y @modelcontextprotocol/server-filesystem</li>
            <li>• STDIO: npx -y @anthropic-ai/claude-code-mcp</li>
            <li>• HTTP: http://localhost:3001/mcp</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {servers.map((server) => {
        const status = serverStatuses[server.id];
        const isSelected = selectedServerId === server.id;
        const isConnected = status?.status === 'connected';
        const isConnecting = status?.status === 'connecting';

        return (
          <div
            key={server.id}
            className={cn(
              "p-4 rounded-xl border transition-all cursor-pointer",
              isSelected
                ? "bg-zinc-800/80 border-emerald-500/50"
                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
            )}
            onClick={() => onSelect(server.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={getStatusColor(status?.status)}>
                    {getStatusIcon(status?.status)}
                  </span>
                  <h3 className="font-medium text-zinc-100 truncate">{server.name}</h3>
                  {getTransportBadge(server.transport)}
                </div>
                
                <p className="text-sm text-zinc-500 truncate">
                  {server.transport === 'stdio' 
                    ? `${server.command} ${server.args?.join(' ') || ''}`
                    : server.url}
                </p>

                {status?.error && (
                  <p className="text-sm text-red-400 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    ⚠️ {status.error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(server);
                  }}
                  className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="편집"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('이 서버를 삭제하시겠습니까?')) {
                      onDelete(server.id);
                    }
                  }}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {isConnected ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDisconnect(server.id);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    연결 해제
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnect(server.id);
                    }}
                    disabled={isLoading || isConnecting}
                    className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {isConnecting ? '연결 중...' : '연결'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


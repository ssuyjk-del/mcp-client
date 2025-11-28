'use client';

import { useState, useEffect, useRef } from 'react';
import { Wrench, ChevronDown, Check, Loader2, Server, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMCP } from '../context/MCPContext';
import type { MCPTool } from '@/lib/mcp/types';

interface MCPToolToggleProps {
  enabledServers: string[];
  onToggle: (serverIds: string[]) => void;
}

export function MCPToolToggle({ enabledServers, onToggle }: MCPToolToggleProps) {
  const { servers, serverStatuses, isConnected, listTools } = useMCP();
  const [isOpen, setIsOpen] = useState(false);
  const [serverTools, setServerTools] = useState<Record<string, MCPTool[]>>({});
  const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 연결된 서버 목록
  const connectedServers = servers.filter(s => isConnected(s.id));

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 서버의 도구 목록 로드
  const loadServerTools = async (serverId: string) => {
    if (serverTools[serverId] || loadingTools.has(serverId)) return;

    setLoadingTools(prev => new Set(prev).add(serverId));
    try {
      const tools = await listTools(serverId);
      setServerTools(prev => ({ ...prev, [serverId]: tools }));
    } catch (error) {
      console.error('Failed to load tools:', error);
      setServerTools(prev => ({ ...prev, [serverId]: [] }));
    } finally {
      setLoadingTools(prev => {
        const next = new Set(prev);
        next.delete(serverId);
        return next;
      });
    }
  };

  // 드롭다운 열릴 때 도구 목록 로드
  useEffect(() => {
    if (isOpen) {
      connectedServers.forEach(server => loadServerTools(server.id));
    }
  }, [isOpen, connectedServers.length]);

  const toggleServer = (serverId: string) => {
    if (enabledServers.includes(serverId)) {
      onToggle(enabledServers.filter(id => id !== serverId));
    } else {
      onToggle([...enabledServers, serverId]);
    }
  };

  const enabledCount = enabledServers.length;
  const totalToolCount = enabledServers.reduce((sum, serverId) => {
    return sum + (serverTools[serverId]?.length || 0);
  }, 0);

  const hasConnectedServers = connectedServers.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all border relative",
          enabledCount > 0
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
            : hasConnectedServers
            ? "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-zinc-300"
            : "bg-zinc-800/30 text-zinc-500 border-zinc-700/50 hover:bg-zinc-700/30 hover:text-zinc-400"
        )}
      >
        <Wrench className="w-4 h-4" />
        <span className="hidden sm:inline">
          {enabledCount > 0 
            ? `MCP 도구` 
            : hasConnectedServers 
            ? 'MCP 도구' 
            : 'MCP 도구 (연결 필요)'}
        </span>
        {enabledCount > 0 && (
          <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {enabledCount}
          </span>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-zinc-700 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">MCP 도구 설정</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-700 rounded"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {connectedServers.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                연결된 MCP 서버가 없습니다.
                <br />
                <a href="/mcp" className="text-primary hover:underline">
                  MCP 서버 설정으로 이동
                </a>
              </div>
            ) : (
              connectedServers.map(server => {
                const isEnabled = enabledServers.includes(server.id);
                const tools = serverTools[server.id] || [];
                const isLoading = loadingTools.has(server.id);

                return (
                  <div key={server.id} className="border-b border-zinc-800 last:border-b-0">
                    <button
                      onClick={() => toggleServer(server.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-800/50 transition-colors",
                        isEnabled && "bg-primary/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm text-zinc-200">{server.name}</span>
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
                        ) : (
                          <span className="text-xs text-zinc-500">
                            ({tools.length} 도구)
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        isEnabled 
                          ? "bg-primary border-primary" 
                          : "border-zinc-600"
                      )}>
                        {isEnabled && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>

                    {isEnabled && tools.length > 0 && (
                      <div className="px-3 pb-2 space-y-1">
                        {tools.map((tool, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 px-2 py-1.5 bg-zinc-800/30 rounded text-xs"
                          >
                            <Wrench className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-mono text-zinc-300">{tool.name}</div>
                              {tool.description && (
                                <div className="text-zinc-500 mt-0.5 line-clamp-2">
                                  {tool.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {enabledCount > 0 && (
            <div className="p-2 border-t border-zinc-700 bg-zinc-800/50">
              <button
                onClick={() => onToggle([])}
                className="w-full text-xs text-zinc-400 hover:text-zinc-200 py-1"
              >
                모든 도구 비활성화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


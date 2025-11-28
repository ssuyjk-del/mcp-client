'use client';

import { useState } from 'react';
import { Wrench, ChevronDown, ChevronUp, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status?: 'pending' | 'running' | 'success' | 'error';
}

interface ToolCallDisplayProps {
  toolCalls: ToolCallInfo[];
  isLoading?: boolean;
}

export function ToolCallDisplay({ toolCalls, isLoading }: ToolCallDisplayProps) {
  const [expandedCalls, setExpandedCalls] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpandedCalls(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (toolCalls.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Wrench className="w-3.5 h-3.5" />
        <span>MCP 도구 호출 {isLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}</span>
      </div>
      
      {toolCalls.map((call, index) => {
        const isExpanded = expandedCalls.has(index);
        const status = call.status || (call.error ? 'error' : call.result !== undefined ? 'success' : 'running');
        
        return (
          <div
            key={index}
            className={cn(
              "rounded-lg border overflow-hidden transition-all",
              status === 'error' 
                ? "border-red-500/30 bg-red-950/20" 
                : status === 'success'
                ? "border-green-500/30 bg-green-950/20"
                : "border-blue-500/30 bg-blue-950/20"
            )}
          >
            <button
              onClick={() => toggleExpand(index)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                {status === 'running' ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <Check className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm font-mono text-zinc-200">{call.name}</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>
            
            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/10">
                <div className="pt-2">
                  <div className="text-xs text-zinc-500 mb-1">입력 파라미터</div>
                  <pre className="text-xs bg-black/30 rounded p-2 overflow-x-auto text-zinc-300 font-mono">
                    {JSON.stringify(call.args, null, 2)}
                  </pre>
                </div>
                
                {call.result !== undefined && (
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">실행 결과</div>
                    <pre className="text-xs bg-black/30 rounded p-2 overflow-x-auto text-zinc-300 font-mono max-h-48 overflow-y-auto">
                      {typeof call.result === 'string' 
                        ? call.result 
                        : JSON.stringify(call.result, null, 2)}
                    </pre>
                  </div>
                )}
                
                {call.error && (
                  <div>
                    <div className="text-xs text-red-400 mb-1">오류</div>
                    <pre className="text-xs bg-red-950/30 rounded p-2 overflow-x-auto text-red-300 font-mono">
                      {call.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


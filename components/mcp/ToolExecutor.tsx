'use client';

import { useState } from 'react';
import { Play, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useMCP } from '@/app/context/MCPContext';
import type { MCPTool } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';

interface ToolExecutorProps {
  serverId: string;
  tools: MCPTool[];
}

export default function ToolExecutor({ serverId, tools }: ToolExecutorProps) {
  const { callTool } = useMCP();
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleExecute = async (toolName: string) => {
    setLoadingTools(prev => new Set(prev).add(toolName));
    setErrors(prev => ({ ...prev, [toolName]: '' }));

    try {
      // JSON으로 파싱 가능한 인자 처리
      const parsedArgs: Record<string, unknown> = {};
      Object.entries(args).forEach(([key, value]) => {
        if (key.startsWith(`${toolName}:`)) {
          const argName = key.replace(`${toolName}:`, '');
          try {
            parsedArgs[argName] = JSON.parse(value);
          } catch {
            parsedArgs[argName] = value;
          }
        }
      });

      const result = await callTool(serverId, toolName, parsedArgs);
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [toolName]: error instanceof Error ? error.message : '실행 실패'
      }));
    } finally {
      setLoadingTools(prev => {
        const next = new Set(prev);
        next.delete(toolName);
        return next;
      });
    }
  };

  const getInputSchema = (tool: MCPTool) => {
    if (!tool.inputSchema) return [];
    
    const schema = tool.inputSchema as { properties?: Record<string, { type?: string; description?: string }> };
    if (!schema.properties) return [];

    return Object.entries(schema.properties).map(([name, prop]) => ({
      name,
      type: prop.type || 'string',
      description: prop.description,
    }));
  };

  if (tools.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>사용 가능한 Tool이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tools.map((tool) => {
        const isExpanded = expandedTool === tool.name;
        const isLoading = loadingTools.has(tool.name);
        const inputFields = getInputSchema(tool);
        const result = results[tool.name];
        const error = errors[tool.name];

        return (
          <div
            key={tool.name}
            className="border border-zinc-800 rounded-xl overflow-hidden"
          >
            {/* 헤더 */}
            <button
              onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                <div className="text-left">
                  <h3 className="font-medium text-zinc-100">{tool.name}</h3>
                  {tool.description && (
                    <p className="text-sm text-zinc-500 mt-0.5">{tool.description}</p>
                  )}
                </div>
              </div>
              <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">
                {inputFields.length} params
              </span>
            </button>

            {/* 확장된 내용 */}
            {isExpanded && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                {/* 입력 필드 */}
                {inputFields.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {inputFields.map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm text-zinc-400 mb-1">
                          {field.name}
                          <span className="text-zinc-600 ml-2">({field.type})</span>
                        </label>
                        <input
                          type="text"
                          value={args[`${tool.name}:${field.name}`] || ''}
                          onChange={(e) => setArgs(prev => ({
                            ...prev,
                            [`${tool.name}:${field.name}`]: e.target.value
                          }))}
                          placeholder={field.description || `Enter ${field.name}`}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 실행 버튼 */}
                <button
                  onClick={() => handleExecute(tool.name)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  실행
                </button>

                {/* 에러 */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* 결과 */}
                {result && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">결과</h4>
                    <pre className={cn(
                      "p-4 bg-zinc-950 rounded-lg overflow-x-auto text-sm",
                      "text-zinc-300 font-mono"
                    )}>
                      {JSON.stringify(result, null, 2)}
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


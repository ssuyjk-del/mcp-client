'use client';

import { useState } from 'react';
import { Play, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useMCP } from '@/app/context/MCPContext';
import type { MCPPrompt } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';

interface PromptExecutorProps {
  serverId: string;
  prompts: MCPPrompt[];
}

export default function PromptExecutor({ serverId, prompts }: PromptExecutorProps) {
  const { getPrompt } = useMCP();
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [loadingPrompts, setLoadingPrompts] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleExecute = async (promptName: string) => {
    setLoadingPrompts(prev => new Set(prev).add(promptName));
    setErrors(prev => ({ ...prev, [promptName]: '' }));

    try {
      const promptArgs: Record<string, string> = {};
      Object.entries(args).forEach(([key, value]) => {
        if (key.startsWith(`${promptName}:`)) {
          const argName = key.replace(`${promptName}:`, '');
          promptArgs[argName] = value;
        }
      });

      const result = await getPrompt(serverId, promptName, promptArgs);
      setResults(prev => ({ ...prev, [promptName]: result }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [promptName]: error instanceof Error ? error.message : '실행 실패'
      }));
    } finally {
      setLoadingPrompts(prev => {
        const next = new Set(prev);
        next.delete(promptName);
        return next;
      });
    }
  };

  if (prompts.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>사용 가능한 Prompt가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => {
        const isExpanded = expandedPrompt === prompt.name;
        const isLoading = loadingPrompts.has(prompt.name);
        const result = results[prompt.name];
        const error = errors[prompt.name];

        return (
          <div
            key={prompt.name}
            className="border border-zinc-800 rounded-xl overflow-hidden"
          >
            {/* 헤더 */}
            <button
              onClick={() => setExpandedPrompt(isExpanded ? null : prompt.name)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                <div className="text-left">
                  <h3 className="font-medium text-zinc-100">{prompt.name}</h3>
                  {prompt.description && (
                    <p className="text-sm text-zinc-500 mt-0.5">{prompt.description}</p>
                  )}
                </div>
              </div>
              <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">
                {prompt.arguments?.length || 0} args
              </span>
            </button>

            {/* 확장된 내용 */}
            {isExpanded && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                {/* 입력 필드 */}
                {prompt.arguments && prompt.arguments.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {prompt.arguments.map((arg) => (
                      <div key={arg.name}>
                        <label className="block text-sm text-zinc-400 mb-1">
                          {arg.name}
                          {arg.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          value={args[`${prompt.name}:${arg.name}`] || ''}
                          onChange={(e) => setArgs(prev => ({
                            ...prev,
                            [`${prompt.name}:${arg.name}`]: e.target.value
                          }))}
                          placeholder={arg.description || `Enter ${arg.name}`}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 실행 버튼 */}
                <button
                  onClick={() => handleExecute(prompt.name)}
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


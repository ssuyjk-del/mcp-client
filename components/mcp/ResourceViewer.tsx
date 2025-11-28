'use client';

import { useState } from 'react';
import { Eye, ChevronDown, ChevronRight, Loader2, FileText, Image, File } from 'lucide-react';
import { useMCP } from '@/app/context/MCPContext';
import type { MCPResource } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';

interface ResourceViewerProps {
  serverId: string;
  resources: MCPResource[];
}

export default function ResourceViewer({ serverId, resources }: ResourceViewerProps) {
  const { readResource } = useMCP();
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, unknown>>({});
  const [loadingResources, setLoadingResources] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRead = async (uri: string) => {
    setLoadingResources(prev => new Set(prev).add(uri));
    setErrors(prev => ({ ...prev, [uri]: '' }));

    try {
      const result = await readResource(serverId, uri);
      setContents(prev => ({ ...prev, [uri]: result }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [uri]: error instanceof Error ? error.message : '읽기 실패'
      }));
    } finally {
      setLoadingResources(prev => {
        const next = new Set(prev);
        next.delete(uri);
        return next;
      });
    }
  };

  const getMimeIcon = (mimeType?: string) => {
    if (!mimeType) return File;
    if (mimeType.startsWith('text/')) return FileText;
    if (mimeType.startsWith('image/')) return Image;
    return File;
  };

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>사용 가능한 Resource가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((resource: MCPResource) => {
        const isExpanded = expandedResource === resource.uri;
        const isLoading = loadingResources.has(resource.uri);
        const content = contents[resource.uri];
        const error = errors[resource.uri];
        const MimeIcon = getMimeIcon(resource.mimeType);

        return (
          <div
            key={resource.uri}
            className="border border-zinc-800 rounded-xl overflow-hidden"
          >
            {/* 헤더 */}
            <button
              onClick={() => setExpandedResource(isExpanded ? null : resource.uri)}
              className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
                <MimeIcon className="w-5 h-5 text-zinc-500" />
                <div className="text-left">
                  <h3 className="font-medium text-zinc-100">{resource.name}</h3>
                  <p className="text-sm text-zinc-500 mt-0.5 font-mono">{resource.uri}</p>
                </div>
              </div>
              {resource.mimeType && (
                <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">
                  {resource.mimeType}
                </span>
              )}
            </button>

            {/* 확장된 내용 */}
            {isExpanded && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                {resource.description && (
                  <p className="text-sm text-zinc-400 mb-4">{resource.description}</p>
                )}

                {/* 읽기 버튼 */}
                <button
                  onClick={() => handleRead(resource.uri)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  읽기
                </button>

                {/* 에러 */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* 콘텐츠 */}
                {content !== undefined && content !== null && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">내용</h4>
                    <pre className={cn(
                      "p-4 bg-zinc-950 rounded-lg overflow-x-auto text-sm",
                      "text-zinc-300 font-mono max-h-96"
                    )}>
                      {JSON.stringify(content, null, 2)}
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


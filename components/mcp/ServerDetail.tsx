'use client';

import { useState, useEffect } from 'react';
import { Wrench, MessageSquare, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useMCP } from '@/app/context/MCPContext';
import type { MCPTool, MCPPrompt, MCPResource } from '@/lib/mcp/types';
import ToolExecutor from './ToolExecutor';
import PromptExecutor from './PromptExecutor';
import ResourceViewer from './ResourceViewer';
import { cn } from '@/lib/utils';

type TabType = 'tools' | 'prompts' | 'resources';

interface ServerDetailProps {
  serverId: string;
}

export default function ServerDetail({ serverId }: ServerDetailProps) {
  const { isConnected, listTools, listPrompts, listResources } = useMCP();
  const [activeTab, setActiveTab] = useState<TabType>('tools');
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = isConnected(serverId);

  useEffect(() => {
    if (!connected) {
      setTools([]);
      setPrompts([]);
      setResources([]);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [toolsData, promptsData, resourcesData] = await Promise.all([
          listTools(serverId).catch(() => []),
          listPrompts(serverId).catch(() => []),
          listResources(serverId).catch(() => []),
        ]);

        setTools(toolsData);
        setPrompts(promptsData);
        setResources(resourcesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터 로드 실패');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [serverId, connected, listTools, listPrompts, listResources]);

  const tabs = [
    { id: 'tools' as TabType, label: 'Tools', icon: Wrench, count: tools.length },
    { id: 'prompts' as TabType, label: 'Prompts', icon: MessageSquare, count: prompts.length },
    { id: 'resources' as TabType, label: 'Resources', icon: FileText, count: resources.length },
  ];

  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>서버에 연결되어 있지 않습니다.</p>
          <p className="text-sm mt-1">연결 버튼을 클릭하여 서버에 연결하세요.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 탭 헤더 */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 text-xs rounded-full",
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-800 text-zinc-500"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tools' && (
          <ToolExecutor serverId={serverId} tools={tools} />
        )}
        {activeTab === 'prompts' && (
          <PromptExecutor serverId={serverId} prompts={prompts} />
        )}
        {activeTab === 'resources' && (
          <ResourceViewer serverId={serverId} resources={resources} />
        )}
      </div>
    </div>
  );
}


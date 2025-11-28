'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { MCPServerConfig, MCPTransportType } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';

interface ServerFormProps {
  onSubmit: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  initialData?: MCPServerConfig;
  mode?: 'create' | 'edit';
}

export default function ServerForm({ onSubmit, onCancel, initialData, mode = 'create' }: ServerFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [transport, setTransport] = useState<MCPTransportType>(initialData?.transport || 'stdio');
  const [command, setCommand] = useState(initialData?.command || '');
  const [args, setArgs] = useState<string[]>(initialData?.args || []);
  const [url, setUrl] = useState(initialData?.url || '');
  const [envPairs, setEnvPairs] = useState<Array<{ key: string; value: string }>>(
    initialData?.env 
      ? Object.entries(initialData.env).map(([key, value]) => ({ key, value }))
      : []
  );
  const [newArg, setNewArg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      transport,
    };

    if (transport === 'stdio') {
      config.command = command;
      config.args = args.filter(a => a.trim());
      if (envPairs.length > 0) {
        config.env = envPairs.reduce((acc, { key, value }) => {
          if (key.trim()) {
            acc[key.trim()] = value;
          }
          return acc;
        }, {} as Record<string, string>);
      }
    } else {
      config.url = url;
    }

    onSubmit(config);
  };

  const addArg = () => {
    if (newArg.trim()) {
      setArgs(prev => [...prev, newArg.trim()]);
      setNewArg('');
    }
  };

  const removeArg = (index: number) => {
    setArgs(prev => prev.filter((_, i) => i !== index));
  };

  const addEnvPair = () => {
    setEnvPairs(prev => [...prev, { key: '', value: '' }]);
  };

  const updateEnvPair = (index: number, field: 'key' | 'value', value: string) => {
    setEnvPairs(prev => prev.map((pair, i) => 
      i === index ? { ...pair, [field]: value } : pair
    ));
  };

  const removeEnvPair = (index: number) => {
    setEnvPairs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 서버 이름 */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          서버 이름 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: My MCP Server"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          required
        />
      </div>

      {/* Transport 타입 */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Transport 타입 <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          {(['stdio', 'streamable-http', 'sse'] as MCPTransportType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTransport(t)}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                transport === t
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {t === 'stdio' ? 'STDIO' : t === 'streamable-http' ? 'HTTP' : 'SSE'}
            </button>
          ))}
        </div>
      </div>

      {/* STDIO 설정 */}
      {transport === 'stdio' && (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Command <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="예: node, npx, python"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Arguments
            </label>
            <div className="space-y-2">
              {args.map((arg, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={arg}
                    readOnly
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeArg(index)}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newArg}
                  onChange={(e) => setNewArg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArg())}
                  placeholder="인자 추가..."
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={addArg}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              환경 변수
            </label>
            <div className="space-y-2">
              {envPairs.map((pair, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={pair.key}
                    onChange={(e) => updateEnvPair(index, 'key', e.target.value)}
                    placeholder="KEY"
                    className="w-1/3 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <input
                    type="text"
                    value={pair.value}
                    onChange={(e) => updateEnvPair(index, 'value', e.target.value)}
                    placeholder="VALUE"
                    className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => removeEnvPair(index)}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEnvPair}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                환경 변수 추가
              </button>
            </div>
          </div>
        </>
      )}

      {/* HTTP/SSE 설정 */}
      {(transport === 'streamable-http' || transport === 'sse') && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="예: http://localhost:3001/mcp"
            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            required
          />
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors"
        >
          {mode === 'create' ? '서버 추가' : '저장'}
        </button>
      </div>
    </form>
  );
}


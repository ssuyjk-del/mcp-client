'use client';

import { useState, useRef } from 'react';
import { 
  Plus, 
  Download, 
  Upload, 
  ArrowLeft,
  Server,
  AlertTriangle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMCP } from '@/app/context/MCPContext';
import ServerForm from '@/components/mcp/ServerForm';
import ServerList from '@/components/mcp/ServerList';
import ServerDetail from '@/components/mcp/ServerDetail';
import type { MCPServerConfig, MCPExportConfig } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';

export default function MCPPage() {
  const {
    servers,
    serverStatuses,
    addServer,
    updateServer,
    deleteServer,
    connect,
    disconnect,
    exportSettings,
    importSettings,
    isLoading,
  } = useMCP();

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddServer = (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    addServer(config);
    setShowForm(false);
  };

  const handleEditServer = (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingServer) {
      updateServer(editingServer.id, config);
      setEditingServer(null);
    }
  };

  const handleConnect = async (serverId: string) => {
    const result = await connect(serverId);
    if (!result.success && result.error) {
      console.error('연결 실패:', result.error);
    }
  };

  const handleDisconnect = async (serverId: string) => {
    await disconnect(serverId);
  };

  const handleDelete = async (serverId: string) => {
    await deleteServer(serverId);
    if (selectedServerId === serverId) {
      setSelectedServerId(null);
    }
  };

  const handleExport = () => {
    const config = exportSettings();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-servers-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const config: MCPExportConfig = JSON.parse(text);
      const result = importSettings(config, true);
      setImportSuccess(`${result.added}개 추가, ${result.updated}개 업데이트됨`);
      setTimeout(() => setImportSuccess(null), 3000);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '파일 가져오기 실패');
    }

    // 파일 입력 초기화
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* 헤더 */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-emerald-400" />
                <h1 className="text-xl font-semibold text-zinc-100">MCP 서버 관리</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                가져오기
              </button>
              <button
                onClick={handleExport}
                disabled={servers.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                내보내기
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                서버 추가
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 보안 경고 배너 */}
      <div className="bg-amber-500/10 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>
              공용 또는 공유 PC에서는 민감한 정보(API 키, 토큰 등)를 저장하지 마세요. 
              서버 설정은 브라우저 localStorage에 저장됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 알림 메시지 */}
      {(importError || importSuccess) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className={cn(
            "p-4 rounded-lg flex items-center justify-between",
            importError ? "bg-red-500/10 text-red-400 border border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          )}>
            <span>{importError || importSuccess}</span>
            <button
              onClick={() => { setImportError(null); setImportSuccess(null); }}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 서버 목록 */}
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
            <h2 className="text-lg font-medium text-zinc-100 mb-4">등록된 서버</h2>
            <ServerList
              servers={servers}
              serverStatuses={serverStatuses}
              selectedServerId={selectedServerId}
              onSelect={setSelectedServerId}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onEdit={(server) => setEditingServer(server)}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>

          {/* 서버 상세 정보 */}
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
            {selectedServerId ? (
              <ServerDetail serverId={selectedServerId} />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 p-12">
                <div className="text-center">
                  <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>서버를 선택하여 상세 정보를 확인하세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 서버 추가 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-zinc-100">새 서버 추가</h2>
            </div>
            <div className="p-6">
              <ServerForm
                onSubmit={handleAddServer}
                onCancel={() => setShowForm(false)}
                mode="create"
              />
            </div>
          </div>
        </div>
      )}

      {/* 서버 편집 모달 */}
      {editingServer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-zinc-100">서버 편집</h2>
            </div>
            <div className="p-6">
              <ServerForm
                initialData={editingServer}
                onSubmit={handleEditServer}
                onCancel={() => setEditingServer(null)}
                mode="edit"
              />
            </div>
          </div>
        </div>
      )}

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}


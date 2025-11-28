'use client';

import { useState, useRef } from 'react';
import { 
  Plus, 
  Download, 
  Upload, 
  Server,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useMCP } from '@/app/context/MCPContext';
import ServerForm from '@/components/mcp/ServerForm';
import ServerList from '@/components/mcp/ServerList';
import ServerDetail from '@/components/mcp/ServerDetail';
import type { MCPServerConfig, MCPExportConfig } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';

interface MCPManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MCPManagerModal({ isOpen, onClose }: MCPManagerModalProps) {
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

    e.target.value = '';
  };

  // ESC 키로 모달 닫기
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-zinc-100">MCP 서버 관리</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">가져오기</span>
            </button>
            <button
              onClick={handleExport}
              disabled={servers.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">내보내기</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">서버 추가</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 보안 경고 배너 */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 shrink-0">
          <div className="flex items-center gap-2 text-amber-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <p>공용/공유 PC에서는 민감한 정보를 저장하지 마세요. 설정은 브라우저 localStorage에 저장됩니다.</p>
          </div>
        </div>

        {/* 알림 메시지 */}
        {(importError || importSuccess) && (
          <div className="px-6 pt-4 shrink-0">
            <div className={cn(
              "p-3 rounded-lg flex items-center justify-between text-sm",
              importError 
                ? "bg-red-500/10 text-red-400 border border-red-500/30" 
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
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
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* 서버 목록 */}
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 p-4 flex flex-col overflow-hidden">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">등록된 서버</h3>
              <div className="flex-1 overflow-y-auto">
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
            </div>

            {/* 서버 상세 정보 */}
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden flex flex-col">
              {selectedServerId ? (
                <ServerDetail serverId={selectedServerId} />
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 p-8">
                  <div className="text-center">
                    <Server className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">서버를 선택하여 상세 정보를 확인하세요.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 서버 추가 서브모달 */}
        {showForm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-medium text-zinc-100">새 서버 추가</h3>
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

        {/* 서버 편집 서브모달 */}
        {editingServer && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-medium text-zinc-100">서버 편집</h3>
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
    </div>
  );
}


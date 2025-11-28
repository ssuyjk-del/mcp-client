'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { 
  MCPServerConfig, 
  MCPServerStatus, 
  MCPTool, 
  MCPPrompt, 
  MCPResource,
  MCPExportConfig,
} from '@/lib/mcp/types';
import {
  getServers,
  addServer as addServerToStorage,
  updateServer as updateServerInStorage,
  deleteServer as deleteServerFromStorage,
  exportConfig,
  importConfig,
} from '@/lib/mcp/storage';

interface MCPContextValue {
  // 서버 설정 관리
  servers: MCPServerConfig[];
  addServer: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => MCPServerConfig;
  updateServer: (id: string, updates: Partial<Omit<MCPServerConfig, 'id' | 'createdAt'>>) => void;
  deleteServer: (id: string) => Promise<void>;
  
  // 연결 상태
  serverStatuses: Record<string, MCPServerStatus>;
  isConnected: (serverId: string) => boolean;
  
  // 연결/해제
  connect: (serverId: string) => Promise<{ success: boolean; error?: string }>;
  disconnect: (serverId: string) => Promise<{ success: boolean; error?: string }>;
  
  // 서버 기능 조회
  listTools: (serverId: string) => Promise<MCPTool[]>;
  listPrompts: (serverId: string) => Promise<MCPPrompt[]>;
  listResources: (serverId: string) => Promise<MCPResource[]>;
  
  // Tool 실행
  callTool: (serverId: string, name: string, args?: Record<string, unknown>) => Promise<unknown>;
  
  // Prompt 실행
  getPrompt: (serverId: string, name: string, args?: Record<string, string>) => Promise<unknown>;
  
  // Resource 읽기
  readResource: (serverId: string, uri: string) => Promise<unknown>;
  
  // 설정 가져오기/내보내기
  exportSettings: () => MCPExportConfig;
  importSettings: (config: MCPExportConfig, merge?: boolean) => { added: number; updated: number };
  
  // 상태 새로고침
  refreshStatus: () => Promise<void>;
  
  // 로딩 상태
  isLoading: boolean;
}

const MCPContext = createContext<MCPContextValue | null>(null);

export function useMCP() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCP must be used within MCPProvider');
  }
  return context;
}

interface MCPProviderProps {
  children: React.ReactNode;
}

export function MCPProvider({ children }: MCPProviderProps) {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [serverStatuses, setServerStatuses] = useState<Record<string, MCPServerStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 초기화: localStorage에서 서버 목록 로드
  useEffect(() => {
    setServers(getServers());
  }, []);

  // 상태 폴링
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('/api/mcp/status');
        if (response.ok) {
          const data = await response.json();
          const statusMap: Record<string, MCPServerStatus> = {};
          data.servers.forEach((status: MCPServerStatus) => {
            statusMap[status.serverId] = status;
          });
          setServerStatuses(statusMap);
        }
      } catch (error) {
        console.error('Failed to poll MCP status:', error);
      }
    };

    // 초기 폴링
    pollStatus();

    // 5초마다 상태 폴링
    statusIntervalRef.current = setInterval(pollStatus, 5000);

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/mcp/status');
      if (response.ok) {
        const data = await response.json();
        const statusMap: Record<string, MCPServerStatus> = {};
        data.servers.forEach((status: MCPServerStatus) => {
          statusMap[status.serverId] = status;
        });
        setServerStatuses(statusMap);
      }
    } catch (error) {
      console.error('Failed to refresh MCP status:', error);
    }
  }, []);

  const addServer = useCallback((config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newServer = addServerToStorage(config);
    setServers(prev => [...prev, newServer]);
    return newServer;
  }, []);

  const updateServer = useCallback((id: string, updates: Partial<Omit<MCPServerConfig, 'id' | 'createdAt'>>) => {
    const updated = updateServerInStorage(id, updates);
    if (updated) {
      setServers(prev => prev.map(s => s.id === id ? updated : s));
    }
  }, []);

  const deleteServer = useCallback(async (id: string) => {
    // 연결 해제 먼저 시도
    await fetch('/api/mcp/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId: id }),
    });
    
    deleteServerFromStorage(id);
    setServers(prev => prev.filter(s => s.id !== id));
    setServerStatuses(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const isConnected = useCallback((serverId: string) => {
    return serverStatuses[serverId]?.status === 'connected';
  }, [serverStatuses]);

  const connect = useCallback(async (serverId: string) => {
    const config = servers.find(s => s.id === serverId);
    if (!config) {
      return { success: false, error: '서버를 찾을 수 없습니다.' };
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const result = await response.json();
      await refreshStatus();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '연결 실패' };
    } finally {
      setIsLoading(false);
    }
  }, [servers, refreshStatus]);

  const disconnect = useCallback(async (serverId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });

      const result = await response.json();
      await refreshStatus();
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '연결 해제 실패' };
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  const listTools = useCallback(async (serverId: string): Promise<MCPTool[]> => {
    const response = await fetch(`/api/mcp/tools?serverId=${serverId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Tools 조회 실패');
    }
    const data = await response.json();
    return data.tools;
  }, []);

  const listPrompts = useCallback(async (serverId: string): Promise<MCPPrompt[]> => {
    const response = await fetch(`/api/mcp/prompts?serverId=${serverId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Prompts 조회 실패');
    }
    const data = await response.json();
    return data.prompts;
  }, []);

  const listResources = useCallback(async (serverId: string): Promise<MCPResource[]> => {
    const response = await fetch(`/api/mcp/resources?serverId=${serverId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Resources 조회 실패');
    }
    const data = await response.json();
    return data.resources;
  }, []);

  const callTool = useCallback(async (serverId: string, name: string, args?: Record<string, unknown>) => {
    const response = await fetch('/api/mcp/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, name, arguments: args }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Tool 실행 실패');
    }
    
    return response.json();
  }, []);

  const getPrompt = useCallback(async (serverId: string, name: string, args?: Record<string, string>) => {
    const response = await fetch('/api/mcp/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, name, arguments: args }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Prompt 실행 실패');
    }
    
    return response.json();
  }, []);

  const readResource = useCallback(async (serverId: string, uri: string) => {
    const response = await fetch('/api/mcp/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, uri }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Resource 읽기 실패');
    }
    
    return response.json();
  }, []);

  const exportSettings = useCallback(() => {
    return exportConfig();
  }, []);

  const importSettings = useCallback((config: MCPExportConfig, merge: boolean = true) => {
    const result = importConfig(config, merge);
    setServers(getServers());
    return result;
  }, []);

  const value: MCPContextValue = {
    servers,
    addServer,
    updateServer,
    deleteServer,
    serverStatuses,
    isConnected,
    connect,
    disconnect,
    listTools,
    listPrompts,
    listResources,
    callTool,
    getPrompt,
    readResource,
    exportSettings,
    importSettings,
    refreshStatus,
    isLoading,
  };

  return (
    <MCPContext.Provider value={value}>
      {children}
    </MCPContext.Provider>
  );
}


import type { MCPServerConfig, MCPExportConfig } from './types';

const STORAGE_KEY = 'mcp-servers';
const EXPORT_VERSION = '1.0.0';

/**
 * localStorage에서 MCP 서버 설정 목록을 가져옵니다.
 */
export function getServers(): MCPServerConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as MCPServerConfig[];
  } catch (error) {
    console.error('MCP 서버 설정 로드 실패:', error);
    return [];
  }
}

/**
 * 단일 MCP 서버 설정을 가져옵니다.
 */
export function getServer(id: string): MCPServerConfig | null {
  const servers = getServers();
  return servers.find(s => s.id === id) || null;
}

/**
 * 새 MCP 서버 설정을 저장합니다.
 */
export function addServer(config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>): MCPServerConfig {
  const servers = getServers();
  const now = Date.now();
  
  const newServer: MCPServerConfig = {
    ...config,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  
  servers.push(newServer);
  saveServers(servers);
  
  return newServer;
}

/**
 * 기존 MCP 서버 설정을 업데이트합니다.
 */
export function updateServer(id: string, updates: Partial<Omit<MCPServerConfig, 'id' | 'createdAt'>>): MCPServerConfig | null {
  const servers = getServers();
  const index = servers.findIndex(s => s.id === id);
  
  if (index === -1) return null;
  
  servers[index] = {
    ...servers[index],
    ...updates,
    updatedAt: Date.now(),
  };
  
  saveServers(servers);
  return servers[index];
}

/**
 * MCP 서버 설정을 삭제합니다.
 */
export function deleteServer(id: string): boolean {
  const servers = getServers();
  const filtered = servers.filter(s => s.id !== id);
  
  if (filtered.length === servers.length) return false;
  
  saveServers(filtered);
  return true;
}

/**
 * 모든 서버 설정을 저장합니다.
 */
function saveServers(servers: MCPServerConfig[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  } catch (error) {
    console.error('MCP 서버 설정 저장 실패:', error);
  }
}

/**
 * 서버 설정을 JSON 형식으로 내보냅니다.
 */
export function exportConfig(): MCPExportConfig {
  const servers = getServers();
  
  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    servers,
  };
}

/**
 * JSON 형식의 서버 설정을 가져옵니다.
 * @param merge true이면 기존 설정과 병합, false이면 덮어쓰기
 */
export function importConfig(config: MCPExportConfig, merge: boolean = true): { added: number; updated: number } {
  if (!config.version || !Array.isArray(config.servers)) {
    throw new Error('유효하지 않은 설정 파일입니다.');
  }
  
  const existingServers = merge ? getServers() : [];
  const existingIds = new Set(existingServers.map(s => s.id));
  
  let added = 0;
  let updated = 0;
  
  const now = Date.now();
  
  for (const server of config.servers) {
    // 필수 필드 검증
    if (!server.name || !server.transport) {
      continue;
    }
    
    if (existingIds.has(server.id)) {
      // 기존 서버 업데이트
      const index = existingServers.findIndex(s => s.id === server.id);
      if (index !== -1) {
        existingServers[index] = {
          ...server,
          updatedAt: now,
        };
        updated++;
      }
    } else {
      // 새 서버 추가
      existingServers.push({
        ...server,
        id: server.id || crypto.randomUUID(),
        createdAt: server.createdAt || now,
        updatedAt: now,
      });
      added++;
    }
  }
  
  saveServers(existingServers);
  
  return { added, updated };
}

/**
 * 모든 서버 설정을 삭제합니다.
 */
export function clearAllServers(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}


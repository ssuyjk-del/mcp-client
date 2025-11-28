// MCP 서버 Transport 타입
export type MCPTransportType = 'stdio' | 'streamable-http' | 'sse';

// MCP 서버 연결 상태
export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// MCP 서버 설정 인터페이스
export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransportType;
  // STDIO Transport용
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // HTTP/SSE Transport용
  url?: string;
  // 메타데이터
  createdAt: number;
  updatedAt: number;
}

// MCP 서버 상태 정보
export interface MCPServerStatus {
  serverId: string;
  status: MCPConnectionStatus;
  error?: string;
  connectedAt?: number;
}

// MCP Tool 정보
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

// MCP Prompt 정보
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// MCP Resource 정보
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP 서버 기능 정보
export interface MCPServerCapabilities {
  tools: MCPTool[];
  prompts: MCPPrompt[];
  resources: MCPResource[];
}

// API 요청/응답 타입
export interface ConnectRequest {
  config: MCPServerConfig;
}

export interface ConnectResponse {
  success: boolean;
  serverId: string;
  error?: string;
}

export interface DisconnectRequest {
  serverId: string;
}

export interface DisconnectResponse {
  success: boolean;
  error?: string;
}

export interface StatusResponse {
  servers: MCPServerStatus[];
}

export interface ListToolsRequest {
  serverId: string;
}

export interface ListToolsResponse {
  tools: MCPTool[];
}

export interface CallToolRequest {
  serverId: string;
  name: string;
  arguments?: Record<string, unknown>;
}

export interface CallToolResponse {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface ListPromptsRequest {
  serverId: string;
}

export interface ListPromptsResponse {
  prompts: MCPPrompt[];
}

export interface GetPromptRequest {
  serverId: string;
  name: string;
  arguments?: Record<string, string>;
}

export interface GetPromptResponse {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: string;
      text?: string;
    };
  }>;
}

export interface ListResourcesRequest {
  serverId: string;
}

export interface ListResourcesResponse {
  resources: MCPResource[];
}

export interface ReadResourceRequest {
  serverId: string;
  uri: string;
}

export interface ReadResourceResponse {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

// 내보내기/가져오기용 설정 형식
export interface MCPExportConfig {
  version: string;
  exportedAt: number;
  servers: MCPServerConfig[];
}


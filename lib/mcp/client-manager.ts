import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type {
  MCPServerConfig,
  MCPServerStatus,
  MCPConnectionStatus,
  MCPTool,
  MCPPrompt,
  MCPResource,
} from './types';

interface ClientInstance {
  client: Client;
  status: MCPConnectionStatus;
  connectedAt?: number;
  error?: string;
}

// Next.js 개발 모드에서 모듈 재로드 시에도 싱글톤 유지를 위한 전역 심볼
const globalForMCP = globalThis as unknown as {
  mcpClientManager: MCPClientManager | undefined;
};

/**
 * MCP Client 싱글톤 관리자
 * 서버별 Client 인스턴스를 Map으로 관리합니다.
 */
class MCPClientManager {
  private clients: Map<string, ClientInstance> = new Map();

  constructor() {
    console.log('[MCP] MCPClientManager instance created');
  }

  static getInstance(): MCPClientManager {
    if (!globalForMCP.mcpClientManager) {
      globalForMCP.mcpClientManager = new MCPClientManager();
    }
    return globalForMCP.mcpClientManager;
  }

  /**
   * MCP 서버에 연결합니다.
   */
  async connect(config: MCPServerConfig): Promise<{ success: boolean; error?: string }> {
    console.log('[MCP] Connecting to server:', config.name, config.transport);
    
    // 이미 연결된 경우
    const existing = this.clients.get(config.id);
    if (existing?.status === 'connected') {
      console.log('[MCP] Already connected');
      return { success: true };
    }

    // 연결 상태 업데이트
    this.clients.set(config.id, {
      client: null as unknown as Client,
      status: 'connecting',
    });

    try {
      console.log('[MCP] Creating client...');
      const client = new Client({
        name: 'mcp-chat-client',
        version: '1.0.0',
      });

      console.log('[MCP] Creating transport...');
      const transport = await this.createTransport(config);
      
      console.log('[MCP] Connecting transport...');
      await client.connect(transport);

      console.log('[MCP] Connected successfully!');
      this.clients.set(config.id, {
        client,
        status: 'connected',
        connectedAt: Date.now(),
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '연결 실패';
      console.error('[MCP] Connection error:', error);
      
      this.clients.set(config.id, {
        client: null as unknown as Client,
        status: 'error',
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Transport 타입에 따라 적절한 Transport 인스턴스를 생성합니다.
   */
  private async createTransport(config: MCPServerConfig) {
    console.log('[MCP] Creating transport for:', config.transport);
    
    switch (config.transport) {
      case 'stdio':
        if (!config.command) {
          throw new Error('STDIO transport에는 command가 필요합니다.');
        }
        console.log('[MCP] STDIO config:', { command: config.command, args: config.args });
        try {
          const transport = new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: config.env,
          });
          console.log('[MCP] StdioClientTransport created');
          return transport;
        } catch (err) {
          console.error('[MCP] StdioClientTransport creation failed:', err);
          throw err;
        }

      case 'streamable-http':
        if (!config.url) {
          throw new Error('Streamable HTTP transport에는 URL이 필요합니다.');
        }
        console.log('[MCP] HTTP URL:', config.url);
        try {
          const transport = new StreamableHTTPClientTransport(new URL(config.url));
          console.log('[MCP] StreamableHTTPClientTransport created');
          return transport;
        } catch (err) {
          console.error('[MCP] StreamableHTTPClientTransport creation failed:', err);
          throw err;
        }

      case 'sse':
        if (!config.url) {
          throw new Error('SSE transport에는 URL이 필요합니다.');
        }
        console.log('[MCP] SSE URL:', config.url);
        try {
          const transport = new SSEClientTransport(new URL(config.url));
          console.log('[MCP] SSEClientTransport created');
          return transport;
        } catch (err) {
          console.error('[MCP] SSEClientTransport creation failed:', err);
          throw err;
        }

      default:
        throw new Error(`지원하지 않는 transport 타입: ${config.transport}`);
    }
  }

  /**
   * MCP 서버 연결을 해제합니다.
   */
  async disconnect(serverId: string): Promise<{ success: boolean; error?: string }> {
    const instance = this.clients.get(serverId);
    
    if (!instance) {
      return { success: true }; // 이미 연결되지 않음
    }

    try {
      if (instance.client && instance.status === 'connected') {
        await instance.client.close();
      }
      
      this.clients.delete(serverId);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '연결 해제 실패';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 모든 MCP 서버의 연결 상태를 반환합니다.
   */
  getStatus(): MCPServerStatus[] {
    const statuses: MCPServerStatus[] = [];
    
    this.clients.forEach((instance, serverId) => {
      statuses.push({
        serverId,
        status: instance.status,
        error: instance.error,
        connectedAt: instance.connectedAt,
      });
    });

    return statuses;
  }

  /**
   * 특정 서버의 연결 상태를 반환합니다.
   */
  getServerStatus(serverId: string): MCPServerStatus | null {
    const instance = this.clients.get(serverId);
    
    if (!instance) {
      return null;
    }

    return {
      serverId,
      status: instance.status,
      error: instance.error,
      connectedAt: instance.connectedAt,
    };
  }

  /**
   * 연결된 Client 인스턴스를 반환합니다.
   */
  getClient(serverId: string): Client {
    const instance = this.clients.get(serverId);
    
    if (!instance || instance.status !== 'connected') {
      throw new Error('서버에 연결되어 있지 않습니다.');
    }

    return instance.client;
  }

  /**
   * 연결된 모든 Client 인스턴스를 반환합니다.
   */
  getConnectedClients(): { serverId: string; client: Client }[] {
    const result: { serverId: string; client: Client }[] = [];
    
    this.clients.forEach((instance, serverId) => {
      if (instance.status === 'connected' && instance.client) {
        result.push({ serverId, client: instance.client });
      }
    });

    return result;
  }

  /**
   * Tools 목록을 조회합니다.
   */
  async listTools(serverId: string): Promise<MCPTool[]> {
    const client = this.getClient(serverId);
    
    try {
      const result = await client.listTools();
      return result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
      }));
    } catch (error) {
      // Method not found (-32601) 에러는 서버가 해당 기능을 지원하지 않는 경우
      if (error instanceof Error && error.message.includes('-32601')) {
        console.log('[MCP] Server does not support listTools');
        return [];
      }
      throw error;
    }
  }

  /**
   * Tool을 실행합니다.
   */
  async callTool(serverId: string, name: string, args?: Record<string, unknown>) {
    const client = this.getClient(serverId);
    const result = await client.callTool({
      name,
      arguments: args || {},
    });

    return {
      content: result.content.map(item => {
        if (item.type === 'text') {
          return { type: 'text', text: item.text };
        } else if (item.type === 'image') {
          return { type: 'image', data: item.data, mimeType: item.mimeType };
        } else if (item.type === 'resource') {
          return { type: 'resource', resource: item.resource };
        }
        return { type: item.type };
      }),
      isError: result.isError,
    };
  }

  /**
   * Prompts 목록을 조회합니다.
   */
  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const client = this.getClient(serverId);
    
    try {
      const result = await client.listPrompts();
      return result.prompts.map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments?.map(arg => ({
          name: arg.name,
          description: arg.description,
          required: arg.required,
        })),
      }));
    } catch (error) {
      // Method not found (-32601) 에러는 서버가 해당 기능을 지원하지 않는 경우
      if (error instanceof Error && error.message.includes('-32601')) {
        console.log('[MCP] Server does not support listPrompts');
        return [];
      }
      throw error;
    }
  }

  /**
   * Prompt를 조회합니다.
   */
  async getPrompt(serverId: string, name: string, args?: Record<string, string>) {
    const client = this.getClient(serverId);
    const result = await client.getPrompt({
      name,
      arguments: args || {},
    });

    return {
      description: result.description,
      messages: result.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    };
  }

  /**
   * Resources 목록을 조회합니다.
   */
  async listResources(serverId: string): Promise<MCPResource[]> {
    const client = this.getClient(serverId);
    
    try {
      const result = await client.listResources();
      return result.resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      }));
    } catch (error) {
      // Method not found (-32601) 에러는 서버가 해당 기능을 지원하지 않는 경우
      if (error instanceof Error && error.message.includes('-32601')) {
        console.log('[MCP] Server does not support listResources');
        return [];
      }
      throw error;
    }
  }

  /**
   * Resource를 읽습니다.
   */
  async readResource(serverId: string, uri: string) {
    const client = this.getClient(serverId);
    const result = await client.readResource({ uri });

    return {
      contents: result.contents.map(content => ({
        uri: content.uri,
        mimeType: content.mimeType,
        text: 'text' in content ? content.text : undefined,
        blob: 'blob' in content ? content.blob : undefined,
      })),
    };
  }

  /**
   * 서버가 연결되어 있는지 확인합니다.
   */
  isConnected(serverId: string): boolean {
    const instance = this.clients.get(serverId);
    return instance?.status === 'connected';
  }

  /**
   * 모든 연결을 해제합니다.
   */
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    
    await Promise.all(
      serverIds.map(serverId => this.disconnect(serverId))
    );
  }
}

// 싱글톤 인스턴스 export
export const mcpClientManager = MCPClientManager.getInstance();


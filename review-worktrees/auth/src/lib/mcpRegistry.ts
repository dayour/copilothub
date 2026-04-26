// ---------------------------------------------------------------------------
// mcpRegistry.ts -- Multi-server MCP registry with resilient routing.
// Provides tool-to-server routing and fallback across multiple MCP clients.
// ---------------------------------------------------------------------------

import mcpClient, { MCPToolResult } from './mcpClient';

export interface MCPToolCallOptions {
  preferredServerId?: string;
  targetSessionId?: string;
  targetThreadId?: string;
  targetBrowserSessionId?: string;
  targetMcpSessionId?: string;
}

export interface MCPClientLike {
  callTool: (
    name: string,
    args: Record<string, unknown>,
    options?: MCPToolCallOptions,
  ) => Promise<MCPToolResult>;
  streamTool?: (
    name: string,
    args: Record<string, unknown>,
    onChunk: (chunk: string) => void,
    options?: MCPToolCallOptions,
  ) => Promise<MCPToolResult>;
}

export interface MCPRegistryEntry {
  id: string;
  client: MCPClientLike;
  toolPrefixes?: string[];
  toolNames?: string[];
}

export class MCPRegistry {
  private servers: MCPRegistryEntry[] = [];
  private defaultServerId: string | null = null;

  constructor(entries?: MCPRegistryEntry[], defaultServerId?: string) {
    if (entries) {
      for (const entry of entries) {
        this.registerServer(entry, { default: entry.id === defaultServerId });
      }
    }

    if (defaultServerId) {
      this.defaultServerId = defaultServerId;
    }
  }

  registerServer(entry: MCPRegistryEntry, options?: { default?: boolean }): void {
    const existingIndex = this.servers.findIndex((server) => server.id === entry.id);
    if (existingIndex >= 0) {
      this.servers.splice(existingIndex, 1);
    }

    this.servers.push(entry);

    if (options?.default || !this.defaultServerId) {
      this.defaultServerId = entry.id;
    }
  }

  setDefaultServer(id: string): void {
    const exists = this.servers.some((server) => server.id === id);
    if (exists) {
      this.defaultServerId = id;
    }
  }

  listServers(): MCPRegistryEntry[] {
    return [...this.servers];
  }

  private matchesTool(entry: MCPRegistryEntry, toolName: string): boolean {
    if (entry.toolNames && entry.toolNames.includes(toolName)) {
      return true;
    }

    if (entry.toolPrefixes) {
      return entry.toolPrefixes.some((prefix) => toolName.startsWith(prefix));
    }

    return false;
  }

  private resolveCandidates(toolName: string, preferredServerId?: string): MCPRegistryEntry[] {
    const candidates: MCPRegistryEntry[] = [];
    const add = (entry: MCPRegistryEntry | undefined) => {
      if (!entry) return;
      if (!candidates.some((server) => server.id === entry.id)) {
        candidates.push(entry);
      }
    };

    const preferredServer = preferredServerId
      ? this.servers.find((server) => server.id === preferredServerId)
      : undefined;
    add(preferredServer);

    for (const entry of this.servers) {
      if (this.matchesTool(entry, toolName)) {
        add(entry);
      }
    }

    const defaultServer = this.servers.find((server) => server.id === this.defaultServerId);
    add(defaultServer);

    for (const entry of this.servers) {
      add(entry);
    }

    return candidates;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    options?: MCPToolCallOptions,
  ): Promise<MCPToolResult> {
    const candidates = this.resolveCandidates(name, options?.preferredServerId);
    if (candidates.length === 0) {
      return {
        success: false,
        content: '',
        error: 'No MCP servers registered.',
        isError: true,
      };
    }

    const errors: string[] = [];

    for (const server of candidates) {
      try {
        const result = await server.client.callTool(name, args, options);
        const isFailure = result?.isError === true || result?.success === false;
        if (!isFailure) {
          return result;
        }

        if (result?.error) {
          errors.push(`[${server.id}] ${result.error}`);
        } else {
          errors.push(`[${server.id}] Tool call failed`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`[${server.id}] ${message}`);
      }
    }

    return {
      success: false,
      content: '',
      error: errors.length > 0 ? errors.join(' | ') : 'MCP tool call failed.',
      isError: true,
    };
  }

  async streamTool(
    name: string,
    args: Record<string, unknown>,
    onChunk: (chunk: string) => void,
    options?: MCPToolCallOptions,
  ): Promise<MCPToolResult> {
    const candidates = this.resolveCandidates(name, options?.preferredServerId);
    if (candidates.length === 0) {
      return {
        success: false,
        content: '',
        error: 'No MCP servers registered.',
        isError: true,
      };
    }

    const errors: string[] = [];

    for (const server of candidates) {
      if (!server.client.streamTool) {
        errors.push(`[${server.id}] Streaming not supported.`);
        continue;
      }

      try {
        const result = await server.client.streamTool(name, args, onChunk, options);
        const isFailure = result?.isError === true || result?.success === false;
        if (!isFailure) {
          return result;
        }

        if (result?.error) {
          errors.push(`[${server.id}] ${result.error}`);
        } else {
          errors.push(`[${server.id}] Streaming failed`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`[${server.id}] ${message}`);
      }
    }

    return {
      success: false,
      content: '',
      error: errors.length > 0 ? errors.join(' | ') : 'MCP streaming call failed.',
      isError: true,
    };
  }
}

// Default registry with the existing sidecar MCP client as the default server.
const mcpRegistry = new MCPRegistry();
mcpRegistry.registerServer({ id: 'default', client: mcpClient });

export default mcpRegistry;

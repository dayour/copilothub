import { describe, it, expect, vi } from 'vitest';
import { MCPRegistry } from './mcpRegistry';

describe('MCPRegistry', () => {
  it('routes tool calls by prefix', async () => {
    const browserClient = {
      callTool: vi.fn().mockResolvedValue({
        success: true,
        content: 'ok',
        error: undefined,
        isError: false,
      }),
    };
    const terminalClient = {
      callTool: vi.fn().mockResolvedValue({
        success: true,
        content: 'terminal',
        error: undefined,
        isError: false,
      }),
    };

    const registry = new MCPRegistry();
    registry.registerServer(
      { id: 'browser', client: browserClient, toolPrefixes: ['browser_'] },
      { default: true },
    );
    registry.registerServer({ id: 'terminal', client: terminalClient, toolPrefixes: ['shell_'] });

    const result = await registry.callTool('browser_click', { element: '.btn' });
    expect(result.success).toBe(true);
    expect(browserClient.callTool).toHaveBeenCalledWith('browser_click', { element: '.btn' }, undefined);
    expect(terminalClient.callTool).not.toHaveBeenCalled();
  });

  it('falls back to other servers when the preferred server fails', async () => {
    const failingClient = {
      callTool: vi.fn().mockResolvedValue({
        success: false,
        content: '',
        error: 'primary failed',
        isError: true,
      }),
    };
    const backupClient = {
      callTool: vi.fn().mockResolvedValue({
        success: true,
        content: 'recovered',
        error: undefined,
        isError: false,
      }),
    };

    const registry = new MCPRegistry();
    registry.registerServer(
      { id: 'primary', client: failingClient, toolPrefixes: ['browser_'] },
      { default: true },
    );
    registry.registerServer({ id: 'backup', client: backupClient, toolPrefixes: ['terminal_'] });

    const result = await registry.callTool('browser_navigate', { url: 'http://example.com' });
    expect(result.success).toBe(true);
    expect(failingClient.callTool).toHaveBeenCalledTimes(1);
    expect(backupClient.callTool).toHaveBeenCalledTimes(1);
  });

  it('uses default server when no prefix matches', async () => {
    const defaultClient = {
      callTool: vi.fn().mockResolvedValue({
        success: true,
        content: 'default',
        error: undefined,
        isError: false,
      }),
    };

    const registry = new MCPRegistry();
    registry.registerServer({ id: 'default', client: defaultClient }, { default: true });

    const result = await registry.callTool('unknown_tool', {});
    expect(result.success).toBe(true);
    expect(defaultClient.callTool).toHaveBeenCalledWith('unknown_tool', {}, undefined);
  });

  it('prioritizes the preferred server id and forwards session targeting metadata', async () => {
    const preferredClient = {
      callTool: vi.fn().mockResolvedValue({
        success: true,
        content: 'preferred',
        error: undefined,
        isError: false,
      }),
    };
    const fallbackClient = {
      callTool: vi.fn().mockResolvedValue({
        success: true,
        content: 'fallback',
        error: undefined,
        isError: false,
      }),
    };

    const registry = new MCPRegistry();
    registry.registerServer({ id: 'fallback', client: fallbackClient, toolPrefixes: ['browser_'] }, { default: true });
    registry.registerServer({ id: 'preferred', client: preferredClient, toolPrefixes: ['browser_'] });

    const result = await registry.callTool(
      'browser_click',
      { selector: '.btn' },
      { preferredServerId: 'preferred', targetSessionId: 'session-42', targetThreadId: 'thread-7' },
    );

    expect(result.success).toBe(true);
    expect(preferredClient.callTool).toHaveBeenCalledWith(
      'browser_click',
      { selector: '.btn' },
      { preferredServerId: 'preferred', targetSessionId: 'session-42', targetThreadId: 'thread-7' },
    );
    expect(fallbackClient.callTool).not.toHaveBeenCalled();
  });
});

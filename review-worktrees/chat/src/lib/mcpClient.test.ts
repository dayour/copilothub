import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APP_CONFIG } from './config';
import { MCPClient, createMCPClient } from './mcpClient';
import { useBrowserActionStore } from '../store/browserActionStore';

describe('MCPClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    useBrowserActionStore.setState({
      actions: [],
      currentSessionId: null,
      isAutomationActive: false,
      maxActions: 500,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses default APP_CONFIG host, port, and timeout', async () => {
    const client = createMCPClient();

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    } as Response);

    await client.connect();
    expect(mockFetch).toHaveBeenCalledWith(
      `http://${APP_CONFIG.sidecarHost}:${APP_CONFIG.sidecarPort}/health`,
      expect.objectContaining({ method: 'GET' }),
    );

    mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
    const result = await client.callTool('browser_navigate', { url: 'http://example.com' });
    expect(result.error).toContain(`${APP_CONFIG.sidecarTimeout}ms`);
  });

  it('connect success sets connected state true', async () => {
    const client = new MCPClient();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    } as Response);

    await client.connect();
    expect(client.isConnected()).toBe(true);
  });

  it('connect failure leaves connected state false', async () => {
    const client = new MCPClient();
    mockFetch.mockRejectedValue(new Error('server down'));

    await expect(client.connect()).rejects.toThrow('unreachable');
    expect(client.isConnected()).toBe(false);
  });

  it('disconnect clears connection state after connect', async () => {
    const client = new MCPClient();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
    } as Response);

    await client.connect();
    expect(client.isConnected()).toBe(true);

    client.disconnect();
    expect(client.isConnected()).toBe(false);
  });

  it('callTool success returns parsed MCPToolResult content', async () => {
    const client = new MCPClient();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: 'text', text: 'tool ok' }],
      }),
    } as Response);

    const result = await client.callTool('browser_click', { selector: '.btn' });
    expect(result.success).toBe(true);
    expect(result.isError).toBe(false);
    expect(result.content).toBe('tool ok');
  });

  it('callTool HTTP error returns failure response', async () => {
    const client = new MCPClient();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const result = await client.callTool('browser_click', { selector: '.btn' });
    expect(result.success).toBe(false);
    expect(result.isError).toBe(true);
    expect(result.error).toContain('HTTP 500');
  });

  it('callTool network error returns failure response', async () => {
    const client = new MCPClient();
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    const result = await client.callTool('browser_click', { selector: '.btn' });
    expect(result.success).toBe(false);
    expect(result.isError).toBe(true);
    expect(result.error).toContain('failed: Network request failed');
  });

  it('callTool timeout returns timeout error response', async () => {
    vi.useFakeTimers();
    const client = new MCPClient({ timeout: 50 });

    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const pending = client.callTool('browser_click', { selector: '.btn' });
    await vi.advanceTimersByTimeAsync(100);
    const result = await pending;

    expect(result.success).toBe(false);
    expect(result.isError).toBe(true);
    expect(result.error).toContain('timed out after 50ms');
  });

  it('navigate wrapper calls callTool with browser_navigate', async () => {
    const client = new MCPClient();
    const callToolSpy = vi.spyOn(client, 'callTool').mockResolvedValue({
      success: true,
      content: '',
      error: undefined,
      isError: false,
    });

    await client.navigate('http://example.com');
    expect(callToolSpy).toHaveBeenCalledWith('browser_navigate', { url: 'http://example.com' });
  });

  it('click wrapper calls callTool with browser_click', async () => {
    const client = new MCPClient();
    const callToolSpy = vi.spyOn(client, 'callTool').mockResolvedValue({
      success: true,
      content: '',
      error: undefined,
      isError: false,
    });

    await client.click('.btn');
    expect(callToolSpy).toHaveBeenCalledWith('browser_click', { selector: '.btn' });
  });

  it('fill wrapper calls callTool with browser_fill', async () => {
    const client = new MCPClient();
    const callToolSpy = vi.spyOn(client, 'callTool').mockResolvedValue({
      success: true,
      content: '',
      error: undefined,
      isError: false,
    });

    await client.fill('#input', 'text');
    expect(callToolSpy).toHaveBeenCalledWith('browser_fill', { selector: '#input', value: 'text' });
  });

  it('screenshot wrapper calls callTool with browser_screenshot', async () => {
    const client = new MCPClient();
    const callToolSpy = vi.spyOn(client, 'callTool').mockResolvedValue({
      success: true,
      content: '',
      error: undefined,
      isError: false,
    });

    await client.screenshot();
    expect(callToolSpy).toHaveBeenCalledWith('browser_screenshot', {});
  });

  it('disconnect aborts pending callTool request', async () => {
    const client = new MCPClient({ timeout: 10_000 });
    let capturedSignal: AbortSignal | undefined;

    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal | undefined;
      return new Promise((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const pending = client.callTool('browser_click', { selector: '.btn' });
    await Promise.resolve();
    client.disconnect();

    const result = await pending;
    expect(capturedSignal?.aborted).toBe(true);
    expect(result.success).toBe(false);
    expect(result.isError).toBe(true);
  });

  it('streamTool returns a timeout error when the stream stalls after starting', async () => {
    vi.useFakeTimers();
    const client = new MCPClient({ timeout: 50 });

    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;

      return Promise.resolve({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: () =>
              new Promise((_resolve, reject) => {
                signal?.addEventListener('abort', () => {
                  reject(new DOMException('Aborted', 'AbortError'));
                }, { once: true });
              }),
            cancel: vi.fn().mockResolvedValue(undefined),
          }),
          cancel: vi.fn().mockResolvedValue(undefined),
        },
      } as unknown as Response);
    });

    const pending = client.streamTool('browser_click', { selector: '.btn' }, vi.fn());
    await vi.advanceTimersByTimeAsync(100);
    const result = await pending;

    expect(result.success).toBe(false);
    expect(result.isError).toBe(true);
    expect(result.error).toContain('timed out after 50ms');
  });

  it('tracks browser actions against the explicit target session when provided', async () => {
    const client = new MCPClient();
    useBrowserActionStore.getState().setSession('selected-session');

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: 'text', text: 'tool ok' }],
      }),
    } as Response);

    await client.callTool(
      'browser_click',
      { selector: '.btn' },
      { targetSessionId: 'session-override', targetThreadId: 'thread-override' },
    );

    const action = useBrowserActionStore.getState().actions[0];
    expect(action?.sessionId).toBe('session-override');
  });
});

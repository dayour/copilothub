// ---------------------------------------------------------------------------
// mcpClient.ts -- MCP Client Bridge for CopilotHub
// Connects to the CopilotBrowser MCP server running as a Tauri sidecar.
// The server exposes browser automation tools via HTTP/SSE on localhost.
// ---------------------------------------------------------------------------

import { APP_CONFIG } from './config';
import { useBrowserActionStore, toolNameToActionType } from '../store/browserActionStore';
import { useAppStore } from '../store/appStore';
import { captureStorage } from './captureStorage';
import type { MCPToolCallOptions } from './mcpRegistry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result returned by every MCP tool invocation.
 */
export interface MCPToolResult {
  /** Whether the tool call completed without error. */
  success: boolean;
  /** Parsed content from the server -- text string or structured object. */
  content: string | Record<string, unknown>;
  /** Human-readable error message when the call fails. */
  error: string | undefined;
  /** Mirror of the server-side isError flag. */
  isError: boolean;
}

/**
 * Configuration for the MCP client connection.
 */
export interface MCPClientConfig {
  /** Hostname of the MCP sidecar server. */
  host: string;
  /** Port the sidecar listens on. */
  port: number;
  /** Request timeout in milliseconds. */
  timeout: number;
}

/**
 * Shape of the JSON-RPC-style request body sent to the MCP server.
 */
interface MCPRequest {
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * Single content item returned by the MCP server.
 */
interface MCPContentItem {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Raw JSON response from the MCP server on POST /mcp.
 */
interface MCPRawResponse {
  content?: MCPContentItem[];
  isError?: boolean;
  error?: { message?: string; code?: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: MCPClientConfig = {
  host: APP_CONFIG.sidecarHost,
  port: APP_CONFIG.sidecarPort,
  timeout: APP_CONFIG.sidecarTimeout,
};

// ---------------------------------------------------------------------------
// MCPClient
// ---------------------------------------------------------------------------

/**
 * Client that bridges the CopilotHub UI to the CopilotBrowser MCP sidecar.
 *
 * Communication happens over plain HTTP (POST /mcp) for one-shot tool calls
 * and HTTP SSE (POST /sse) for streaming tool calls. Both endpoints live on
 * the same localhost origin served by the Tauri sidecar process.
 */
export class MCPClient {
  private readonly config: MCPClientConfig;
  private connected: boolean = false;
  private activeAbortControllers: Set<AbortController> = new Set();

  constructor(config?: Partial<MCPClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------------

  /** Base URL derived from current config. */
  private get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Verify that the MCP sidecar is reachable.
   *
   * Attempts GET /health first; falls back to GET /sse (the SSE endpoint
   * will return 200 with an event stream header even without a body).
   * Throws if neither probe succeeds.
   */
  async connect(): Promise<void> {
    const probeEndpoints = ['/health', '/sse'];
    let lastError: Error | null = null;

    for (const endpoint of probeEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status === 200) {
          // If the probe was against the SSE endpoint we got a stream --
          // consume and discard it immediately so the connection is freed.
          if (endpoint === '/sse' && response.body) {
            response.body.cancel().catch(() => {
              /* intentional no-op: stream may already be closed */
            });
          }
          this.connected = true;
          return;
        }

        lastError = new Error(
          `MCP server probe ${endpoint} returned HTTP ${response.status}`,
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    this.connected = false;
    throw new Error(
      `MCP server at ${this.baseUrl} is unreachable: ${lastError?.message ?? 'unknown error'}`,
    );
  }

  /**
   * Disconnect from the MCP server.
   * Aborts every in-flight request and SSE stream.
   */
  disconnect(): void {
    for (const controller of this.activeAbortControllers) {
      controller.abort();
    }
    this.activeAbortControllers.clear();
    this.connected = false;
  }

  /** Returns true when the last connect() probe succeeded and disconnect() has not been called. */
  isConnected(): boolean {
    return this.connected;
  }

  // -----------------------------------------------------------------------
  // Low-level transport
  // -----------------------------------------------------------------------

  /**
   * Build the canonical MCP request body for a tool invocation.
   */
  private buildRequest(name: string, args: Record<string, unknown>): MCPRequest {
    return {
      method: 'tools/call',
      params: { name, arguments: args },
    };
  }

  /**
   * Register an AbortController so disconnect() can clean it up, and
   * remove it automatically once the signal fires.
   */
  private trackController(controller: AbortController): void {
    this.activeAbortControllers.add(controller);
    const cleanup = () => {
      this.activeAbortControllers.delete(controller);
    };
    controller.signal.addEventListener('abort', cleanup, { once: true });
  }

  private untrackController(controller: AbortController): void {
    this.activeAbortControllers.delete(controller);
  }

  /**
   * Parse raw MCP server JSON into a normalised MCPToolResult.
   */
  private parseResponse(raw: MCPRawResponse): MCPToolResult {
    const isError = raw.isError === true || raw.error !== undefined;

    // Extract textual content -- MCP responses use { content: [{ type, text }] }
    let content: string | Record<string, unknown> = '';
    if (raw.content && Array.isArray(raw.content) && raw.content.length > 0) {
      const first = raw.content[0];
      if (first.type === 'text' && typeof first.text === 'string') {
        // Attempt to parse the text as JSON for structured payloads.
        try {
          content = JSON.parse(first.text) as Record<string, unknown>;
        } catch {
          content = first.text;
        }
      } else {
        // Non-text content item -- pass through the whole item as-is.
        const { type: _type, ...rest } = first;
        content = rest as Record<string, unknown>;
      }
    }

    const errorMessage =
      raw.error?.message ??
      (isError && typeof content === 'string' && content.length > 0
        ? content
        : undefined);

    return {
      success: !isError,
      content,
      error: errorMessage,
      isError,
    };
  }

  // -----------------------------------------------------------------------
  // Browser action event helpers
  // -----------------------------------------------------------------------

  /**
   * Emit a browser action event to the store before executing a tool call.
   * Returns the action ID for subsequent status updates.
   */
  private emitActionStart(
    name: string,
    args: Record<string, unknown>,
    options?: MCPToolCallOptions,
  ): string {
    const store = useBrowserActionStore.getState();
    const actionId = crypto.randomUUID();
    store.pushAction({
      type: toolNameToActionType(name),
      toolName: name,
      status: 'running',
      args,
      sessionId: options?.targetSessionId ?? store.currentSessionId ?? undefined,
    });
    // pushAction generates its own ID; grab the last action's ID.
    const actions = useBrowserActionStore.getState().actions;
    return actions[actions.length - 1]?.id ?? actionId;
  }

  /**
   * Update a browser action after tool completion.
   */
  private emitActionEnd(actionId: string, result: MCPToolResult): void {
    const store = useBrowserActionStore.getState();
    const updates: Parameters<typeof store.updateAction>[1] = {
      status: result.success ? 'completed' : 'error',
      endTime: Date.now(),
      result: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
      error: result.error,
    };

    // If the result contains a screenshot (base64 image), create a blob URL
    if (result.success && typeof result.content === 'object' && result.content !== null) {
      const content = result.content as Record<string, unknown>;
      if (typeof content.data === 'string' && typeof content.mimeType === 'string' &&
          (content.mimeType as string).startsWith('image/')) {
        try {
          const binary = atob(content.data as string);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: content.mimeType as string });
          // Revoke any previous screenshot blob URL to prevent memory leaks
          const existing = store.actions.find((a) => a.id === actionId);
          if (existing?.screenshotUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(existing.screenshotUrl);
          }
          updates.screenshotUrl = URL.createObjectURL(blob);

          // Persist to disk under ~/Pictures/Screenshots/CopilotHub/.
          // Fire-and-forget — failures (e.g. running in web preview without
          // Tauri) must never break the in-memory screenshot flow.
          if (useAppStore.getState().browserUsePersistScreenshots) {
            void captureStorage
              .saveScreenshot(bytes, content.mimeType as string)
              .catch(() => {
                /* ignore persistence errors */
              });
          }
        } catch {
          // Failed to decode screenshot, skip
        }
      }
    }

    store.updateAction(actionId, updates);
  }

  // -----------------------------------------------------------------------
  // One-shot tool call  (POST /mcp)
  // -----------------------------------------------------------------------

  /**
   * Execute a tool on the MCP server and return the full result.
   *
   * @param name  - MCP tool name (e.g. "browser_navigate")
   * @param args  - Tool arguments
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
    options?: MCPToolCallOptions,
  ): Promise<MCPToolResult> {
    const isBrowserTool = name.startsWith('browser_');
    const actionId = isBrowserTool ? this.emitActionStart(name, args, options) : undefined;

    const controller = new AbortController();
    this.trackController(controller);

    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildRequest(name, args)),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const result: MCPToolResult = {
          success: false,
          content: '',
          error: `MCP server returned HTTP ${response.status}: ${response.statusText}`,
          isError: true,
        };
        if (isBrowserTool && actionId) this.emitActionEnd(actionId, result);
        return result;
      }

      const raw: MCPRawResponse = await response.json();
      const result = this.parseResponse(raw);
      if (isBrowserTool && actionId) this.emitActionEnd(actionId, result);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);

      let result: MCPToolResult;

      if (err instanceof DOMException && err.name === 'AbortError') {
        result = {
          success: false,
          content: '',
          error: `Tool call "${name}" timed out after ${this.config.timeout}ms`,
          isError: true,
        };
      } else {
        const message = err instanceof Error ? err.message : String(err);
        result = {
          success: false,
          content: '',
          error: `Tool call "${name}" failed: ${message}`,
          isError: true,
        };
      }

      if (isBrowserTool && actionId) this.emitActionEnd(actionId, result);
      return result;
    } finally {
      this.untrackController(controller);
    }
  }

  // -----------------------------------------------------------------------
  // Streaming tool call  (POST /sse)
  // -----------------------------------------------------------------------

  /**
   * Execute a tool via the SSE streaming endpoint.
   *
   * The server responds with `text/event-stream`. Each SSE event carries a
   * `data:` line containing a JSON object with partial content. The onChunk
   * callback is invoked for every chunk. The method resolves with the final
   * aggregated result once the stream closes.
   *
   * @param name    - MCP tool name
   * @param args    - Tool arguments
   * @param onChunk - Callback fired for each incremental chunk of text
   */
  async streamTool(
    name: string,
    args: Record<string, unknown>,
    onChunk: (chunk: string) => void,
    options?: MCPToolCallOptions,
  ): Promise<MCPToolResult> {
    const isBrowserTool = name.startsWith('browser_');
    const actionId = isBrowserTool ? this.emitActionStart(name, args, options) : undefined;

    const controller = new AbortController();
    this.trackController(controller);

    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    let response: Response | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let result: MCPToolResult | undefined;

    try {
      response = await fetch(`${this.baseUrl}/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(this.buildRequest(name, args)),
        signal: controller.signal,
      });

      if (!response.ok) {
        result = {
          success: false,
          content: '',
          error: `MCP SSE server returned HTTP ${response.status}: ${response.statusText}`,
          isError: true,
        };
        return result;
      }

      if (!response.body) {
        result = {
          success: false,
          content: '',
          error: 'MCP SSE response has no readable body stream',
          isError: true,
        };
        return result;
      }

      // Parse the SSE event stream manually. Fetch ReadableStream gives us
      // raw bytes, so we decode and split on the SSE wire format.
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aggregatedContent = '';
      let lastRaw: MCPRawResponse | null = null;
      const MAX_ITERATIONS = 10_000;
      let iterations = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) break;

          iterations += 1;
          if (iterations > MAX_ITERATIONS) {
            throw new Error(`SSE stream exceeded maximum iteration limit (${MAX_ITERATIONS})`);
          }

          buffer += decoder.decode(value, { stream: true });

          // SSE events are delimited by double newlines.
          const events = buffer.split('\n\n');
          // The last element is either empty or an incomplete event -- keep it.
          buffer = events.pop() ?? '';

          for (const event of events) {
            const lines = event.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;

              const payload = line.slice('data:'.length).trim();
              if (payload.length === 0) continue;

              try {
                const parsed: MCPRawResponse = JSON.parse(payload);
                lastRaw = parsed;

                // Extract incremental text for the chunk callback.
                if (parsed.content && Array.isArray(parsed.content)) {
                  for (const item of parsed.content) {
                    if (item.type === 'text' && typeof item.text === 'string') {
                      aggregatedContent += item.text;
                      onChunk(item.text);
                    }
                  }
                }
              } catch {
                // Non-JSON data line -- treat as raw text chunk.
                aggregatedContent += payload;
                onChunk(payload);
              }
            }
          }
        } catch {
          if (controller.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          break;
        }
      }

      // Build final result from the last received event (or the aggregate).
      if (lastRaw) {
        result = this.parseResponse(lastRaw);
        return result;
      }

      result = {
        success: true,
        content: aggregatedContent,
        error: undefined,
        isError: false,
      };
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        result = {
          success: false,
          content: '',
          error: `Streaming tool call "${name}" timed out after ${this.config.timeout}ms`,
          isError: true,
        };
        return result;
      }

      const message = err instanceof Error ? err.message : String(err);
      result = {
        success: false,
        content: '',
        error: `Streaming tool call "${name}" failed: ${message}`,
        isError: true,
      };
      return result;
    } finally {
      clearTimeout(timeoutId);
      this.untrackController(controller);
      if (isBrowserTool && actionId && result) {
        this.emitActionEnd(actionId, result);
      }
      if (reader) {
        await reader.cancel().catch(() => {
          /* intentional no-op */
        });
      }
      if (response?.body) {
        await response.body.cancel().catch(() => {
          /* intentional no-op */
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Typed browser-automation wrappers
  // -----------------------------------------------------------------------

  /**
   * Navigate the browser to the given URL.
   */
  async navigate(url: string): Promise<MCPToolResult> {
    return this.callTool('browser_navigate', { url });
  }

  /**
   * Click on the element matching the given CSS selector.
   */
  async click(selector: string): Promise<MCPToolResult> {
    return this.callTool('browser_click', { selector });
  }

  /**
   * Fill an input element with the provided value.
   */
  async fill(selector: string, value: string): Promise<MCPToolResult> {
    return this.callTool('browser_fill', { selector, value });
  }

  /**
   * Extract text content from the element matching the selector.
   */
  async extract(selector: string): Promise<MCPToolResult> {
    return this.callTool('browser_extract', { selector });
  }

  /**
   * Capture a screenshot of the current browser viewport.
   */
  async screenshot(): Promise<MCPToolResult> {
    return this.callTool('browser_screenshot', {});
  }

  /**
   * Capture an accessibility snapshot of the current page.
   */
  async snapshot(): Promise<MCPToolResult> {
    return this.callTool('browser_snapshot', {});
  }

  /**
   * Evaluate arbitrary JavaScript in the browser context.
   */
  async evaluate(script: string): Promise<MCPToolResult> {
    return this.callTool('browser_evaluate', { script });
  }
}

// ---------------------------------------------------------------------------
// Singleton and factory
// ---------------------------------------------------------------------------

/**
 * Create a new MCPClient instance with the given configuration.
 * Use this when you need a client with non-default settings.
 */
export function createMCPClient(config?: Partial<MCPClientConfig>): MCPClient {
  return new MCPClient(config);
}

/**
 * Default singleton MCP client configured with standard defaults.
 * Import this for the common case where only one sidecar connection is needed.
 */
const mcpClient = new MCPClient();
export default mcpClient;

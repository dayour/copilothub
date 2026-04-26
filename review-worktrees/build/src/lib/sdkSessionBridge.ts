// ---------------------------------------------------------------------------
// sdkSessionBridge.ts -- Bridges the copilot-sdk CopilotSession event model
// to the browserActionStore in CopilotHub. Translates session events (tool
// calls, results, errors) into tracked browser actions without directly
// importing from copilot-sdk -- all types are defined as compatible interfaces.
// ---------------------------------------------------------------------------

import {
  useBrowserActionStore,
  toolNameToActionType,
} from '../store/browserActionStore';

// ---------------------------------------------------------------------------
// Interfaces -- compatible with copilot-sdk without importing it
// ---------------------------------------------------------------------------

/** Shape of a tool call event from copilot-sdk sessions. */
export interface SdkToolCallEvent {
  type: 'tool.call' | 'tool.result';
  data: {
    toolCallId: string;
    toolName: string;
    arguments?: Record<string, unknown>;
    result?: string;
    error?: string;
  };
}

/** Shape of a session event from copilot-sdk. */
export interface SdkSessionEvent {
  type: string;
  data: Record<string, unknown>;
}

/** Stored memory entry for a browser session. */
export interface BrowserSessionMemory {
  sessionId: string;
  conversationId: string | null;
  actionCount: number;
  lastUrl?: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// SdkSessionBridge
// ---------------------------------------------------------------------------

/**
 * Bridges copilot-sdk CopilotSession events to the CopilotHub
 * browserActionStore. Listens for tool-call events, translates browser_*
 * invocations into tracked BrowserActions, and maintains lightweight
 * session memory for LLM context.
 */
export class SdkSessionBridge {
  private sessionId: string | null = null;
  private conversationId: string | null = null;
  private memories: Map<string, BrowserSessionMemory> = new Map();

  /** Map of toolCallId → action id for correlating results. */
  private pendingCalls: Map<string, string> = new Map();

  /** Last URL visited during the session. */
  private lastUrl: string | undefined;

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  /** Bind this bridge to a copilot-sdk session. */
  bind(sessionId: string, conversationId?: string): void {
    this.sessionId = sessionId;
    this.conversationId = conversationId ?? null;
    this.pendingCalls.clear();
    this.lastUrl = undefined;

    useBrowserActionStore.getState().setSession(sessionId);
  }

  /** Unbind the current session. */
  unbind(): void {
    this.saveMemory();
    this.sessionId = null;
    this.conversationId = null;
    this.pendingCalls.clear();
    this.lastUrl = undefined;

    useBrowserActionStore.getState().setSession(null);
  }

  // -----------------------------------------------------------------------
  // Event processing
  // -----------------------------------------------------------------------

  /**
   * Process an event from the copilot-sdk session.
   * If it's a browser_* tool call, emit to browserActionStore.
   */
  processEvent(event: SdkSessionEvent): void {
    if (!this.sessionId) return;

    const { type, data } = event;

    if (type === 'tool.call') {
      this.handleToolCall(data as SdkToolCallEvent['data']);
    } else if (type === 'tool.result') {
      this.handleToolResult(data as SdkToolCallEvent['data']);
    }
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  /** Get the current session ID. */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get formatted conversation context for LLM prompts.
   * Returns a BrowserSessionMemory summarising the browser action history.
   */
  getSessionMemory(sessionId: string): BrowserSessionMemory | null {
    return this.memories.get(sessionId) ?? null;
  }

  /** Get all stored memories. */
  getAllMemories(): BrowserSessionMemory[] {
    return Array.from(this.memories.values());
  }

  // -----------------------------------------------------------------------
  // Memory persistence
  // -----------------------------------------------------------------------

  /** Save current session state as a memory entry. */
  saveMemory(): void {
    if (!this.sessionId) return;

    const store = useBrowserActionStore.getState();
    const sessionActions = store.getSessionActions(this.sessionId);
    const now = Date.now();

    const existing = this.memories.get(this.sessionId);

    const completedCount = sessionActions.filter(
      (a) => a.status === 'completed',
    ).length;
    const errorCount = sessionActions.filter(
      (a) => a.status === 'error',
    ).length;

    const summary = [
      `${sessionActions.length} actions`,
      completedCount > 0 ? `${completedCount} completed` : null,
      errorCount > 0 ? `${errorCount} errors` : null,
      this.lastUrl ? `last url: ${this.lastUrl}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const memory: BrowserSessionMemory = {
      sessionId: this.sessionId,
      conversationId: this.conversationId,
      actionCount: sessionActions.length,
      lastUrl: this.lastUrl,
      summary,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.memories.set(this.sessionId, memory);
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private isBrowserTool(toolName: string): boolean {
    return toolName.startsWith('browser_');
  }

  private handleToolCall(data: SdkToolCallEvent['data']): void {
    const { toolCallId, toolName, arguments: args } = data;
    if (!this.isBrowserTool(toolName)) return;

    // Track the latest URL from browser_navigate calls
    if (toolName === 'browser_navigate' && args?.url) {
      this.lastUrl = String(args.url);
    }

    const store = useBrowserActionStore.getState();

    store.pushAction({
      type: toolNameToActionType(toolName),
      toolName,
      status: 'running',
      args: args ?? {},
      sessionId: this.sessionId ?? undefined,
    });

    // The newest action is at the end of the array
    const actions = useBrowserActionStore.getState().actions;
    const pushed = actions[actions.length - 1];
    if (pushed) {
      this.pendingCalls.set(toolCallId, pushed.id);
    }
  }

  private handleToolResult(data: SdkToolCallEvent['data']): void {
    const { toolCallId, result, error } = data;

    const actionId = this.pendingCalls.get(toolCallId);
    if (!actionId) return;

    const store = useBrowserActionStore.getState();
    const now = Date.now();

    store.updateAction(actionId, {
      status: error ? 'error' : 'completed',
      result: result ?? undefined,
      error: error ?? undefined,
      endTime: now,
    });

    this.pendingCalls.delete(toolCallId);
  }
}

// ---------------------------------------------------------------------------
// Factory & singleton
// ---------------------------------------------------------------------------

/** Create a new SdkSessionBridge instance. */
export function createSdkSessionBridge(): SdkSessionBridge {
  return new SdkSessionBridge();
}

/**
 * Default singleton bridge. Import this for the common case where a single
 * copilot-sdk session is active at a time.
 */
const sdkSessionBridge = new SdkSessionBridge();
export default sdkSessionBridge;

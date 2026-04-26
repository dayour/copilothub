// ---------------------------------------------------------------------------
// sessionMemoryMapper.ts -- Maps MCP browser sessions to copilot-sdk
// conversation sessions and manages persistent memory. Provides linked
// session tracking, browser state snapshots, and formatted LLM context
// injection for CopilotHub browser automation workflows.
// ---------------------------------------------------------------------------

import { useBrowserActionStore } from '../store/browserActionStore';
import type { BrowserAction } from '../store/browserActionStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A linked pair of MCP browser session + copilot-sdk conversation. */
export interface LinkedSession {
  id: string;
  mcpSessionId: string;
  conversationId: string | null;
  name: string;
  createdAt: number;
  lastActiveAt: number;
  actionCount: number;
  lastUrl?: string;
}

/** Serialized browser state for persistence. */
export interface BrowserStateSnapshot {
  sessionId: string;
  url: string;
  title: string;
  timestamp: number;
  actionSummary: string[];
  observationText?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a duration in ms to a human-readable string (e.g. "1.2s"). */
function formatDuration(ms: number | undefined): string {
  if (ms == null) return '?s';
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Summarize a single BrowserAction as a human-readable string. */
function summarizeAction(action: BrowserAction): string {
  const target =
    (action.args?.url as string) ??
    (action.args?.ref as string) ??
    (action.args?.element as string) ??
    (action.args?.text as string) ??
    '';
  const label = target ? ` -> ${JSON.stringify(target)}` : '';
  const dur = formatDuration(action.duration);
  return `${action.type}${label} (${action.status}, ${dur})`;
}

// ---------------------------------------------------------------------------
// SessionMemoryMapper
// ---------------------------------------------------------------------------

/**
 * Maps MCP browser sessions to copilot-sdk conversation sessions.
 * Maintains linked session metadata, browser state snapshots, and
 * generates formatted context strings for LLM prompt injection.
 */
export class SessionMemoryMapper {
  private sessions: Map<string, LinkedSession> = new Map();
  private snapshots: Map<string, BrowserStateSnapshot[]> = new Map();

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  /** Create a new linked browser session. */
  createBrowserSession(
    name?: string,
    conversationId?: string,
  ): LinkedSession {
    const id = crypto.randomUUID();
    const now = Date.now();

    const session: LinkedSession = {
      id,
      mcpSessionId: id,
      conversationId: conversationId ?? null,
      name: name ?? `Session ${this.sessions.size + 1}`,
      createdAt: now,
      lastActiveAt: now,
      actionCount: 0,
      lastUrl: undefined,
    };

    this.sessions.set(id, session);
    this.snapshots.set(id, []);

    // Bind the browser action store to this session
    useBrowserActionStore.getState().setSession(id);

    return session;
  }

  /** Get a linked session by ID. */
  getSession(sessionId: string): LinkedSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /** List all sessions. */
  listSessions(): LinkedSession[] {
    return Array.from(this.sessions.values());
  }

  // -----------------------------------------------------------------------
  // Browser state snapshots
  // -----------------------------------------------------------------------

  /**
   * Save the current browser state as a snapshot.
   * Pulls the latest URL and action summary from browserActionStore.
   */
  saveBrowserState(sessionId: string): BrowserStateSnapshot {
    const store = useBrowserActionStore.getState();
    const actions = store.getSessionActions(sessionId);

    // Find the latest navigate action to determine current URL
    const lastNav = [...actions]
      .reverse()
      .find((a) => a.type === 'navigate' && a.args?.url);
    const url = lastNav ? String(lastNav.args.url) : '';

    // Find the latest snapshot/observe action for the page title
    const lastObserve = [...actions]
      .reverse()
      .find((a) => a.type === 'snapshot' || a.type === 'observe');
    const title = lastObserve?.result
      ? extractTitle(lastObserve.result)
      : '';

    // Summarize the last 10 actions
    const recentActions = actions.slice(-10);
    const actionSummary = recentActions.map(summarizeAction);

    // Extract latest observation text from the most recent snapshot/observe
    const observationText = lastObserve?.result ?? undefined;

    const snapshot: BrowserStateSnapshot = {
      sessionId,
      url,
      title,
      timestamp: Date.now(),
      actionSummary,
      observationText,
    };

    const sessionSnapshots = this.snapshots.get(sessionId) ?? [];
    sessionSnapshots.push(snapshot);
    this.snapshots.set(sessionId, sessionSnapshots);

    // Update the linked session metadata
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastUrl = url || session.lastUrl;
      session.lastActiveAt = Date.now();
      session.actionCount = actions.length;
    }

    return snapshot;
  }

  /** Get all snapshots for a session. */
  getSnapshots(sessionId: string): BrowserStateSnapshot[] {
    return this.snapshots.get(sessionId) ?? [];
  }

  /**
   * Restore browser state from a snapshot (returns the snapshot data;
   * caller is responsible for actually navigating).
   */
  restoreBrowserState(
    sessionId: string,
    snapshotIndex?: number,
  ): BrowserStateSnapshot | null {
    const sessionSnapshots = this.snapshots.get(sessionId);
    if (!sessionSnapshots || sessionSnapshots.length === 0) return null;

    const index = snapshotIndex ?? sessionSnapshots.length - 1;
    return sessionSnapshots[index] ?? null;
  }

  // -----------------------------------------------------------------------
  // LLM context generation
  // -----------------------------------------------------------------------

  /**
   * Get formatted conversation context for LLM prompts.
   * Returns a string combining session metadata, action history,
   * and latest observations -- suitable for injecting into system prompts.
   */
  getConversationContext(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';

    const store = useBrowserActionStore.getState();
    const actions = store.getSessionActions(sessionId);
    const sessionSnapshots = this.snapshots.get(sessionId) ?? [];
    const latestSnapshot =
      sessionSnapshots.length > 0
        ? sessionSnapshots[sessionSnapshots.length - 1]
        : null;

    // Build the recent actions list (last 10)
    const recentActions = actions.slice(-10);
    const actionLines = recentActions
      .map((a, i) => `${i + 1}. ${summarizeAction(a)}`)
      .join('\n');

    const url =
      session.lastUrl ?? latestSnapshot?.url ?? '(no URL recorded)';

    const parts: string[] = [
      '## Browser Session Context',
      `Session: ${session.name} (ID: ${session.id})`,
      `Last URL: ${url}`,
      `Actions performed: ${actions.length}`,
    ];

    if (recentActions.length > 0) {
      parts.push('', '### Recent Actions:', actionLines);
    }

    if (latestSnapshot?.observationText) {
      parts.push('', '### Latest Observation:', latestSnapshot.observationText);
    }

    return parts.join('\n');
  }

  // -----------------------------------------------------------------------
  // Session maintenance
  // -----------------------------------------------------------------------

  /** Update session activity timestamp and action count. */
  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const store = useBrowserActionStore.getState();
    const actions = store.getSessionActions(sessionId);

    session.lastActiveAt = Date.now();
    session.actionCount = actions.length;

    // Update lastUrl from the latest navigate action
    const lastNav = [...actions]
      .reverse()
      .find((a) => a.type === 'navigate' && a.args?.url);
    if (lastNav) {
      session.lastUrl = String(lastNav.args.url);
    }
  }

  /** Delete a session and its snapshots. */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.snapshots.delete(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Attempt to extract a page title from a snapshot/observe result string. */
function extractTitle(result: string): string {
  // Common patterns: "title: My Page" or first line of the result
  const titleMatch = result.match(/title:\s*(.+)/i);
  if (titleMatch) return titleMatch[1].trim();
  const firstLine = result.split('\n')[0]?.trim() ?? '';
  return firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine;
}

// ---------------------------------------------------------------------------
// Singleton & factory
// ---------------------------------------------------------------------------

export const sessionMemoryMapper = new SessionMemoryMapper();

export function createSessionMemoryMapper(): SessionMemoryMapper {
  return new SessionMemoryMapper();
}

export default sessionMemoryMapper;

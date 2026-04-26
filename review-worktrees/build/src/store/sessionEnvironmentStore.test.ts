import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultSessionEnvironment,
  createSessionEnvironment,
} from '../lib/sessionEnvironment';
import {
  createSessionThread,
  getDefaultThreadTitle,
} from '../lib/sessionThread';
import { useAppStore } from './appStore';
import { useSessionEnvironmentStore } from './sessionEnvironmentStore';

const WORKSPACE_PATH = 'E:\\copilothub';

function makeInitialState() {
  const session = createDefaultSessionEnvironment(WORKSPACE_PATH);
  const thread = createSessionThread({
    projectPath: session.projectPath,
    sessionEnvironmentId: session.id,
    title: getDefaultThreadTitle(session.projectPath),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });

  return { session, thread };
}

describe('sessionEnvironmentStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    useAppStore.setState({
      terminalShell: 'powershell',
      sandboxMode: 'workspace-write',
    });

    const initial = makeInitialState();
    useSessionEnvironmentStore.setState({
      sessions: [initial.session],
      selectedSessionId: initial.session.id,
      threads: [initial.thread],
      selectedThreadId: initial.thread.id,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('seeds a workspace session and main thread by default', () => {
    const state = useSessionEnvironmentStore.getState();
    const selectedSession = state.selectedSession();
    const selectedThread = state.selectedThread();

    expect(state.sessions).toHaveLength(1);
    expect(state.threads).toHaveLength(1);
    expect(selectedSession?.projectPath).toBe(WORKSPACE_PATH);
    expect(selectedSession?.shellType).toBe('powershell');
    expect(selectedThread?.projectPath).toBe(WORKSPACE_PATH);
    expect(selectedThread?.sessionEnvironmentId).toBe(selectedSession?.id);
  });

  it('creates and selects a new standalone session environment', () => {
    useAppStore.setState({
      terminalShell: 'git-bash',
      sandboxMode: 'full-access',
    });

    const created = useSessionEnvironmentStore.getState().createSession({
      name: 'Feature Session',
      projectPath: 'E:\\copilothub\\feature-a',
      envVars: { NODE_ENV: 'test' },
    });

    const state = useSessionEnvironmentStore.getState();
    expect(state.sessions).toHaveLength(2);
    expect(state.selectedSessionId).toBe(created.id);
    expect(state.selectedSession()?.name).toBe('Feature Session');
    expect(state.selectedSession()?.shellType).toBe('git-bash');
    expect(state.selectedSession()?.sandboxMode).toBe('full-access');
    expect(state.selectedSession()?.envVars).toEqual({ NODE_ENV: 'test' });
    expect(state.threads).toHaveLength(1);
  });

  it('creates a thread with a linked session environment and selects both', () => {
    const created = useSessionEnvironmentStore.getState().createThread({
      title: 'Bug Bash',
      projectPath: 'E:\\copilothub\\feature-b',
      shellType: 'git-bash',
      envVars: { DEBUG: '1' },
    });

    const state = useSessionEnvironmentStore.getState();
    const linkedSession = state.getThreadSession(created.id);

    expect(state.threads).toHaveLength(2);
    expect(state.selectedThreadId).toBe(created.id);
    expect(state.selectedThread()?.title).toBe('Bug Bash');
    expect(linkedSession?.envVars).toEqual({ DEBUG: '1' });
    expect(state.selectedSessionId).toBe(linkedSession?.id ?? null);
  });

  it('renames a thread and its linked session label', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThread()?.id as string;

    vi.setSystemTime(new Date('2025-01-01T00:05:00.000Z'));
    useSessionEnvironmentStore.getState().renameThread(threadId, 'Planning Thread');

    const state = useSessionEnvironmentStore.getState();
    const thread = state.getThreadById(threadId);
    const session = state.getThreadSession(threadId);

    expect(thread?.title).toBe('Planning Thread');
    expect(thread?.updatedAt).toBe(new Date('2025-01-01T00:05:00.000Z').getTime());
    expect(session?.name).toBe('Planning Thread');
  });

  it('updates session metadata and env vars with fresh timestamps', () => {
    const sessionId = useSessionEnvironmentStore.getState().selectedSession()?.id as string;

    vi.setSystemTime(new Date('2025-01-01T00:05:00.000Z'));
    useSessionEnvironmentStore.getState().updateSession(sessionId, {
      shellType: 'wsl',
      sandboxMode: 'windows-sandbox',
      envVars: { PATH: 'C:\\Tools' },
    });

    vi.setSystemTime(new Date('2025-01-01T00:06:00.000Z'));
    useSessionEnvironmentStore.getState().setEnvVar(sessionId, 'DEBUG', '1');

    const updated = useSessionEnvironmentStore.getState().getSessionById(sessionId);
    expect(updated?.shellType).toBe('powershell');
    expect(updated?.sandboxMode).toBe('windows-sandbox');
    expect(updated?.envVars).toEqual({ PATH: 'C:\\Tools', DEBUG: '1' });
    expect(updated?.updatedAt).toBe(new Date('2025-01-01T00:06:00.000Z').getTime());
  });

  it('keeps shell and sandbox transitions type-safe for WSL sessions', () => {
    const sessionId = useSessionEnvironmentStore.getState().selectedSession()?.id as string;

    useSessionEnvironmentStore.getState().updateSession(sessionId, {
      sandboxMode: 'wsl',
    });

    let updated = useSessionEnvironmentStore.getState().getSessionById(sessionId);
    expect(updated?.sandboxMode).toBe('wsl');
    expect(updated?.shellType).toBe('wsl');

    useSessionEnvironmentStore.getState().updateSession(sessionId, {
      shellType: 'powershell',
    });

    updated = useSessionEnvironmentStore.getState().getSessionById(sessionId);
    expect(updated?.sandboxMode).toBe('workspace-write');
    expect(updated?.shellType).toBe('powershell');
  });

  it('resolves sessions by linked browser and MCP ids', () => {
    const created = useSessionEnvironmentStore.getState().createThread({
      title: 'Linked Thread',
      projectPath: 'E:\\copilothub\\feature-c',
    });
    const linkedSession = useSessionEnvironmentStore.getState().getThreadSession(created.id);

    useSessionEnvironmentStore.getState().setBrowserSessionId(linkedSession?.id as string, 'browser-123');
    useSessionEnvironmentStore.getState().addMcpSessionId(linkedSession?.id as string, 'mcp-a');
    useSessionEnvironmentStore.getState().addMcpSessionId(linkedSession?.id as string, 'mcp-a');
    useSessionEnvironmentStore.getState().addMcpSessionId(linkedSession?.id as string, 'mcp-b');

    const state = useSessionEnvironmentStore.getState();
    expect(state.getSessionByBrowserSessionId('browser-123')?.id).toBe(linkedSession?.id);
    expect(state.getSessionByMcpSessionId('mcp-b')?.id).toBe(linkedSession?.id);
    expect(state.getSessionById(linkedSession?.id as string)?.mcpSessionIds).toEqual(['mcp-a', 'mcp-b']);
  });

  it('keeps browser and MCP session bindings unique across sessions', () => {
    const firstThread = useSessionEnvironmentStore.getState().createThread({
      title: 'Thread One',
      projectPath: 'E:\\copilothub\\feature-one',
    });
    const secondThread = useSessionEnvironmentStore.getState().createThread({
      title: 'Thread Two',
      projectPath: 'E:\\copilothub\\feature-two',
    });
    const store = useSessionEnvironmentStore.getState();
    const firstSessionId = store.getThreadSession(firstThread.id)?.id as string;
    const secondSessionId = store.getThreadSession(secondThread.id)?.id as string;

    store.setBrowserSessionId(firstSessionId, 'browser-shared');
    store.addMcpSessionId(firstSessionId, 'mcp-shared');

    store.setBrowserSessionId(secondSessionId, 'browser-shared');
    store.updateSession(secondSessionId, {
      mcpSessionIds: ['mcp-shared', 'mcp-shared', 'mcp-unique'],
    });

    const firstSession = useSessionEnvironmentStore.getState().getSessionById(firstSessionId);
    const secondSession = useSessionEnvironmentStore.getState().getSessionById(secondSessionId);

    expect(firstSession?.browserSessionId).toBeNull();
    expect(firstSession?.mcpSessionIds).toEqual([]);
    expect(secondSession?.browserSessionId).toBe('browser-shared');
    expect(secondSession?.mcpSessionIds).toEqual(['mcp-shared', 'mcp-unique']);
  });

  it('selectThread keeps session and thread selection aligned', () => {
    const created = useSessionEnvironmentStore.getState().createThread({
      title: 'Review Thread',
      projectPath: 'E:\\copilothub\\feature-d',
    });
    const state = useSessionEnvironmentStore.getState();

    state.selectThread(created.id);

    expect(state.selectedThread()?.id).toBe(created.id);
    expect(state.selectedSession()?.id).toBe(state.getThreadSession(created.id)?.id);
  });

  it('deletes a thread-linked session and falls back to a remaining thread', () => {
    const baseline = useSessionEnvironmentStore.getState().selectedThread() as ReturnType<typeof createSessionThread>;
    const created = useSessionEnvironmentStore.getState().createThread({
      title: 'Disposable Thread',
      projectPath: WORKSPACE_PATH,
    });
    const createdSession = useSessionEnvironmentStore.getState().getThreadSession(created.id);

    useSessionEnvironmentStore.getState().deleteSession(createdSession?.id as string);

    const state = useSessionEnvironmentStore.getState();
    expect(state.threads).toHaveLength(1);
    expect(state.selectedThreadId).toBe(baseline.id);
    expect(state.selectedSessionId).toBe(baseline.sessionEnvironmentId);
  });

  it('removes MCP ids and env vars without disturbing unrelated state', () => {
    const sessionId = useSessionEnvironmentStore.getState().selectedSession()?.id as string;

    useSessionEnvironmentStore.getState().setEnvVar(sessionId, 'A', '1');
    useSessionEnvironmentStore.getState().setEnvVar(sessionId, 'B', '2');
    useSessionEnvironmentStore.getState().addMcpSessionId(sessionId, 'mcp-a');
    useSessionEnvironmentStore.getState().addMcpSessionId(sessionId, 'mcp-b');

    useSessionEnvironmentStore.getState().removeEnvVar(sessionId, 'A');
    useSessionEnvironmentStore.getState().removeMcpSessionId(sessionId, 'mcp-a');

    const session = useSessionEnvironmentStore.getState().getSessionById(sessionId);
    expect(session?.envVars).toEqual({ B: '2' });
    expect(session?.mcpSessionIds).toEqual(['mcp-b']);
  });
});

// ---------------------------------------------------------------------------
// sessionEnvironmentStore.ts -- Zustand store for per-session workspace
// environments used by terminals, browser contexts, and future parallel
// agent threads.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  applySessionExecutionSelectionChange,
  createDefaultSessionEnvironment,
  createSessionEnvironment,
  deriveSessionSandbox,
  type SessionEnvironment,
  type SessionEnvironmentInput,
} from '../lib/sessionEnvironment';
import {
  createSessionThread,
  getDefaultThreadTitle,
  type CreateSessionThreadInput,
  type SessionThread,
} from '../lib/sessionThread';
import { useAppStore } from './appStore';

export interface SessionEnvironmentStore {
  sessions: SessionEnvironment[];
  selectedSessionId: string | null;
  threads: SessionThread[];
  selectedThreadId: string | null;

  selectedSession: () => SessionEnvironment | null;
  getSessionById: (id: string) => SessionEnvironment | null;
  getSessionsByProjectPath: (projectPath: string) => SessionEnvironment[];
  getSessionByBrowserSessionId: (browserSessionId: string) => SessionEnvironment | null;
  getSessionByMcpSessionId: (mcpSessionId: string) => SessionEnvironment | null;
  selectedThread: () => SessionThread | null;
  getThreadById: (id: string) => SessionThread | null;
  getThreadsByProjectPath: (projectPath: string) => SessionThread[];
  getThreadSession: (threadId: string) => SessionEnvironment | null;

  createSession: (input?: SessionEnvironmentInput) => SessionEnvironment;
  createThread: (input?: CreateSessionThreadInput) => SessionThread;
  updateSession: (
    id: string,
    updates: Partial<Omit<SessionEnvironment, 'id' | 'createdAt' | 'sandbox'>>,
  ) => void;
  deleteSession: (id: string) => void;
  selectSession: (id: string | null) => void;
  renameThread: (id: string, title: string) => void;
  selectThread: (id: string | null) => void;
  setEnvVar: (id: string, key: string, value: string) => void;
  removeEnvVar: (id: string, key: string) => void;
  setBrowserSessionId: (id: string, browserSessionId: string | null) => void;
  addMcpSessionId: (id: string, mcpSessionId: string) => void;
  removeMcpSessionId: (id: string, mcpSessionId: string) => void;
}

function buildInitialSessions(): SessionEnvironment[] {
  const appState = useAppStore.getState();
  return [
    createDefaultSessionEnvironment(undefined, {
      shellType: appState.terminalShell,
      sandboxMode: appState.sandboxMode,
    }),
  ];
}

function buildInitialThreads(sessions: SessionEnvironment[]): SessionThread[] {
  return sessions.map((session) =>
    createSessionThread({
      sessionEnvironmentId: session.id,
      projectPath: session.projectPath,
      title: getDefaultThreadTitle(session.projectPath),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }),
  );
}

function touchSession(session: SessionEnvironment): void {
  session.updatedAt = Date.now();
}

function touchThread(thread: SessionThread): void {
  thread.updatedAt = Date.now();
}

function uniqueStringValues(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function clearBrowserSessionBinding(
  sessions: SessionEnvironment[],
  ownerId: string,
  browserSessionId: string | null,
): void {
  if (!browserSessionId) {
    return;
  }

  for (const session of sessions) {
    if (session.id === ownerId || session.browserSessionId !== browserSessionId) {
      continue;
    }

    session.browserSessionId = null;
    touchSession(session);
  }
}

function clearMcpSessionBindings(
  sessions: SessionEnvironment[],
  ownerId: string,
  mcpSessionIds: readonly string[],
): void {
  if (mcpSessionIds.length === 0) {
    return;
  }

  const claimedIds = new Set(mcpSessionIds);
  for (const session of sessions) {
    if (session.id === ownerId) {
      continue;
    }

    const nextIds = session.mcpSessionIds.filter((candidate) => !claimedIds.has(candidate));
    if (nextIds.length === session.mcpSessionIds.length) {
      continue;
    }

    session.mcpSessionIds = nextIds;
    touchSession(session);
  }
}

export const useSessionEnvironmentStore = create<SessionEnvironmentStore>()(
  immer((set, get) => {
    const initialSessions = buildInitialSessions();
    const initialThreads = buildInitialThreads(initialSessions);

    return {
      sessions: initialSessions,
      selectedSessionId: initialSessions[0]?.id ?? null,
      threads: initialThreads,
      selectedThreadId: initialThreads[0]?.id ?? null,

      selectedSession: () => {
        const state = get();
        const selectedId = state.selectedSessionId ?? state.sessions[0]?.id ?? null;
        if (!selectedId) return null;

        return state.sessions.find((session) => session.id === selectedId) ?? null;
      },

      getSessionById: (id: string) =>
        get().sessions.find((session) => session.id === id) ?? null,

      getSessionsByProjectPath: (projectPath: string) =>
        get().sessions.filter((session) => session.projectPath === projectPath),

      getSessionByBrowserSessionId: (browserSessionId: string) =>
        get().sessions.find((session) => session.browserSessionId === browserSessionId) ?? null,

      getSessionByMcpSessionId: (mcpSessionId: string) =>
        get().sessions.find((session) => session.mcpSessionIds.includes(mcpSessionId)) ?? null,

      selectedThread: () => {
        const state = get();
        const selectedId = state.selectedThreadId ?? state.threads[0]?.id ?? null;
        if (!selectedId) return null;

        return state.threads.find((thread) => thread.id === selectedId) ?? null;
      },

      getThreadById: (id: string) =>
        get().threads.find((thread) => thread.id === id) ?? null,

      getThreadsByProjectPath: (projectPath: string) =>
        get().threads.filter((thread) => thread.projectPath === projectPath),

      getThreadSession: (threadId: string) => {
        const state = get();
        const thread = state.threads.find((candidate) => candidate.id === threadId);
        if (!thread) return null;

        return state.sessions.find((session) => session.id === thread.sessionEnvironmentId) ?? null;
      },

      createSession: (input = {}) => {
        const appState = useAppStore.getState();
        const session = createSessionEnvironment({
          ...input,
          shellType: input.shellType ?? appState.terminalShell,
          sandboxMode: input.sandboxMode ?? appState.sandboxMode,
        });

        set((state) => {
          clearBrowserSessionBinding(state.sessions, session.id, session.browserSessionId);
          clearMcpSessionBindings(state.sessions, session.id, session.mcpSessionIds);
          state.sessions.push(session);
          state.selectedSessionId = session.id;
        });

        return session;
      },

      createThread: (input = {}) => {
        const projectPath =
          input.projectPath?.trim() ??
          get().selectedSession()?.projectPath ??
          initialSessions[0]?.projectPath ??
          '';
        const appState = useAppStore.getState();

        const session = createSessionEnvironment({
          projectPath,
          shellType: input.shellType ?? appState.terminalShell,
          sandboxMode: input.sandboxMode ?? appState.sandboxMode,
          envVars: input.envVars,
          browserSessionId: input.browserSessionId,
          mcpSessionIds: input.mcpSessionIds,
          name: input.title?.trim() || undefined,
        });

        const projectThreads = get().threads.filter(
          (thread) => thread.projectPath === session.projectPath,
        );

        const thread = createSessionThread({
          projectPath: session.projectPath,
          sessionEnvironmentId: session.id,
          title:
            input.title?.trim() ||
            (projectThreads.length === 0
              ? getDefaultThreadTitle(session.projectPath)
              : `Thread ${projectThreads.length + 1}`),
        });

        set((state) => {
          clearBrowserSessionBinding(state.sessions, session.id, session.browserSessionId);
          clearMcpSessionBindings(state.sessions, session.id, session.mcpSessionIds);
          state.sessions.push(session);
          state.threads.push(thread);
          state.selectedSessionId = session.id;
          state.selectedThreadId = thread.id;
        });

        return thread;
      },

      updateSession: (id, updates) => {
        set((state) => {
          const session = state.sessions.find((candidate) => candidate.id === id);
          if (!session) return;
          const linkedThread = state.threads.find(
            (thread) => thread.sessionEnvironmentId === id,
          );
          const nextExecution = applySessionExecutionSelectionChange(
            {
              shellType: session.shellType,
              sandboxMode: session.sandboxMode,
            },
            {
              shellType: updates.shellType,
              sandboxMode: updates.sandboxMode,
            },
          );

          if (updates.name !== undefined) {
            session.name = updates.name;
            if (linkedThread) {
              linkedThread.title = updates.name;
            }
          }

          if (updates.projectPath !== undefined) {
            session.projectPath = updates.projectPath;
            if (linkedThread) {
              linkedThread.projectPath = updates.projectPath;
            }
          }

          if (updates.shellType !== undefined || updates.sandboxMode !== undefined) {
            session.shellType = nextExecution.shellType;
            session.sandboxMode = nextExecution.sandboxMode;
            session.sandbox = deriveSessionSandbox(nextExecution);
          }

          if (updates.envVars !== undefined) {
            session.envVars = { ...updates.envVars };
          }

          if (updates.browserSessionId !== undefined) {
            clearBrowserSessionBinding(state.sessions, session.id, updates.browserSessionId);
            session.browserSessionId = updates.browserSessionId;
          }

          if (updates.mcpSessionIds !== undefined) {
            const uniqueIds = uniqueStringValues(updates.mcpSessionIds);
            clearMcpSessionBindings(state.sessions, session.id, uniqueIds);
            session.mcpSessionIds = uniqueIds;
          }

          if (updates.updatedAt !== undefined) {
            session.updatedAt = updates.updatedAt;
          } else {
            touchSession(session);
          }

          if (linkedThread) {
            touchThread(linkedThread);
          }
        });
      },

      deleteSession: (id) => {
        set((state) => {
          const index = state.sessions.findIndex((session) => session.id === id);
          if (index === -1) return;

          const removedSession = state.sessions[index];
          state.sessions.splice(index, 1);
          const removedThreadIds = state.threads
            .filter((thread) => thread.sessionEnvironmentId === id)
            .map((thread) => thread.id);
          state.threads = state.threads.filter((thread) => thread.sessionEnvironmentId !== id);

          if (state.selectedSessionId === id) {
            state.selectedSessionId =
              state.sessions[index]?.id ?? state.sessions[index - 1]?.id ?? null;
          }

          if (removedThreadIds.includes(state.selectedThreadId ?? '')) {
            const fallbackThread =
              state.threads.find((thread) => thread.projectPath === removedSession.projectPath) ??
              state.threads[0] ??
              null;
            state.selectedThreadId = fallbackThread?.id ?? null;
            state.selectedSessionId =
              fallbackThread?.sessionEnvironmentId ?? state.selectedSessionId;
          }
        });
      },

      selectSession: (id) => {
        set((state) => {
          if (id === null) {
            state.selectedSessionId = null;
            return;
          }

          const exists = state.sessions.some((session) => session.id === id);
          if (exists) {
            state.selectedSessionId = id;
            const linkedThread = state.threads.find(
              (thread) => thread.sessionEnvironmentId === id,
            );
            if (linkedThread) {
              state.selectedThreadId = linkedThread.id;
            }
          }
        });
      },

      renameThread: (id, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;

        set((state) => {
          const thread = state.threads.find((candidate) => candidate.id === id);
          if (!thread) return;

          thread.title = trimmed;
          touchThread(thread);

          const session = state.sessions.find(
            (candidate) => candidate.id === thread.sessionEnvironmentId,
          );
          if (session) {
            session.name = trimmed;
            touchSession(session);
          }
        });
      },

      selectThread: (id) => {
        set((state) => {
          if (id === null) {
            state.selectedThreadId = null;
            return;
          }

          const thread = state.threads.find((candidate) => candidate.id === id);
          if (!thread) return;

          state.selectedThreadId = id;
          state.selectedSessionId = thread.sessionEnvironmentId;
        });
      },

      setEnvVar: (id, key, value) => {
        set((state) => {
          const session = state.sessions.find((candidate) => candidate.id === id);
          if (!session) return;

          session.envVars[key] = value;
          touchSession(session);
        });
      },

      removeEnvVar: (id, key) => {
        set((state) => {
          const session = state.sessions.find((candidate) => candidate.id === id);
          if (!session || !(key in session.envVars)) return;

          delete session.envVars[key];
          touchSession(session);
        });
      },

      setBrowserSessionId: (id, browserSessionId) => {
        set((state) => {
          const session = state.sessions.find((candidate) => candidate.id === id);
          if (!session) return;

          clearBrowserSessionBinding(state.sessions, session.id, browserSessionId);
          session.browserSessionId = browserSessionId;
          touchSession(session);
        });
      },

      addMcpSessionId: (id, mcpSessionId) => {
        set((state) => {
          const session = state.sessions.find((candidate) => candidate.id === id);
          if (!session || session.mcpSessionIds.includes(mcpSessionId)) return;

          clearMcpSessionBindings(state.sessions, session.id, [mcpSessionId]);
          session.mcpSessionIds.push(mcpSessionId);
          touchSession(session);
        });
      },

      removeMcpSessionId: (id, mcpSessionId) => {
        set((state) => {
          const session = state.sessions.find((candidate) => candidate.id === id);
          if (!session) return;

          const nextIds = session.mcpSessionIds.filter((candidate) => candidate !== mcpSessionId);
          if (nextIds.length === session.mcpSessionIds.length) return;

          session.mcpSessionIds = nextIds;
          touchSession(session);
        });
      },
    };
  }),
);

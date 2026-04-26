// ---------------------------------------------------------------------------
// chatStore.ts -- Zustand store for chat / conversation state in CopilotHub
// Manages messages, streaming, tool calls, and mention-based routing.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useSessionEnvironmentStore } from './sessionEnvironmentStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMode = 'chat' | 'action';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'error';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: string;
  status: ToolCallStatus;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls: ToolCall[];
  isStreaming: boolean;
}

export type MentionTarget =
  | '@browser'
  | '@vscode'
  | '@terminal'
  | '@runbook'
  | '@agent365'
  | '@dataverse';

export interface ChatThreadState {
  threadId: string;
  messages: ChatMessage[];
  mode: ChatMode;
  isProcessing: boolean;
  activeMention: MentionTarget | null;
  inputDraft: string;
}

export const EMPTY_CHAT_MESSAGES: ChatMessage[] = [];

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface ChatStore {
  threadStateById: Record<string, ChatThreadState>;

  // -- Actions --
  getThreadState: (threadId?: string | null) => ChatThreadState;
  sendMessage: (content: string, threadId?: string | null) => string;
  appendStreamChunk: (messageId: string, chunk: string, threadId?: string | null) => void;
  completeStream: (messageId: string, threadId?: string | null) => void;
  addToolCall: (messageId: string, toolCall: ToolCall, threadId?: string | null) => void;
  updateToolCall: (
    messageId: string,
    toolCallId: string,
    result: string,
    threadId?: string | null,
  ) => void;
  clearMessages: (threadId?: string | null) => void;
  setMode: (mode: ChatMode, threadId?: string | null) => void;
  setActiveMention: (target: MentionTarget | null, threadId?: string | null) => void;
  setInputDraft: (draft: string, threadId?: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _msgIdCounter = 0;
function nextMessageId(): string {
  _msgIdCounter += 1;
  return `msg-${_msgIdCounter}-${Date.now()}`;
}

function createMessage(role: MessageRole, content: string): ChatMessage {
  return {
    id: nextMessageId(),
    role,
    content,
    timestamp: Date.now(),
    toolCalls: [],
    isStreaming: false,
  };
}

const DEFAULT_CHAT_THREAD_ID = 'default-thread';

function resolveThreadId(threadId?: string | null): string {
  return (
    threadId ??
    useSessionEnvironmentStore.getState().selectedThreadId ??
    DEFAULT_CHAT_THREAD_ID
  );
}

function createInitialThreadState(threadId: string): ChatThreadState {
  return {
    threadId,
    messages: [],
    mode: 'chat',
    isProcessing: false,
    activeMention: null,
    inputDraft: '',
  };
}

function getOrCreateThreadState(
  state: { threadStateById: Record<string, ChatThreadState> },
  threadId: string,
): ChatThreadState {
  state.threadStateById[threadId] ??= createInitialThreadState(threadId);
  return state.threadStateById[threadId];
}

function findThreadStateForMessage(
  state: { threadStateById: Record<string, ChatThreadState> },
  messageId: string,
  preferredThreadId?: string | null,
): ChatThreadState | undefined {
  if (preferredThreadId) {
    const preferred = state.threadStateById[preferredThreadId];
    if (preferred?.messages.some((message) => message.id === messageId)) {
      return preferred;
    }
  }

  return Object.values(state.threadStateById).find((threadState) =>
    threadState.messages.some((message) => message.id === messageId),
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatStore>()(
  immer((set, get) => ({
    threadStateById: {},

    getThreadState: (threadId) => {
      const resolvedThreadId = resolveThreadId(threadId);
      return get().threadStateById[resolvedThreadId] ?? createInitialThreadState(resolvedThreadId);
    },

    // -- Actions -------------------------------------------------------------

    sendMessage: (content: string, threadId) => {
      const resolvedThreadId = resolveThreadId(threadId);
      let assistantId = '';

      set((state) => {
        const threadState = getOrCreateThreadState(state, resolvedThreadId);

        // 1. Append the user message
        const userMsg = createMessage('user', content);
        threadState.messages.push(userMsg);

        // 2. Create a placeholder assistant message for streaming
        const assistantMsg = createMessage('assistant', '');
        assistantMsg.isStreaming = true;
        assistantId = assistantMsg.id;
        threadState.messages.push(assistantMsg);

        // 3. Mark processing active and clear input draft
        threadState.isProcessing = true;
        threadState.inputDraft = '';
      });

      return assistantId;
    },

    appendStreamChunk: (messageId: string, chunk: string, threadId) => {
      set((state) => {
        const threadState = findThreadStateForMessage(
          state,
          messageId,
          resolveThreadId(threadId),
        );
        const msg = threadState?.messages.find((message) => message.id === messageId);
        if (msg && msg.isStreaming) {
          msg.content += chunk;
        }
      });
    },

    completeStream: (messageId: string, threadId) => {
      set((state) => {
        const threadState = findThreadStateForMessage(
          state,
          messageId,
          resolveThreadId(threadId),
        );
        const msg = threadState?.messages.find((message) => message.id === messageId);
        if (msg) {
          msg.isStreaming = false;
        }
        // Only clear processing if no other messages are still streaming
        const anyStillStreaming =
          threadState?.messages.some((message) => message.isStreaming) ?? false;
        if (threadState && !anyStillStreaming) {
          threadState.isProcessing = false;
        }
      });
    },

    addToolCall: (messageId: string, toolCall: ToolCall, threadId) => {
      set((state) => {
        const threadState = findThreadStateForMessage(
          state,
          messageId,
          resolveThreadId(threadId),
        );
        const msg = threadState?.messages.find((message) => message.id === messageId);
        if (msg) {
          msg.toolCalls.push(toolCall);
        }
      });
    },

    updateToolCall: (
      messageId: string,
      toolCallId: string,
      result: string,
      threadId,
    ) => {
      set((state) => {
        const threadState = findThreadStateForMessage(
          state,
          messageId,
          resolveThreadId(threadId),
        );
        const msg = threadState?.messages.find((message) => message.id === messageId);
        if (!msg) return;
        const tc = msg.toolCalls.find((t) => t.id === toolCallId);
        if (tc) {
          tc.result = result;
          tc.status = 'completed';
        }
      });
    },

    clearMessages: (threadId) => {
      const resolvedThreadId = resolveThreadId(threadId);

      set((state) => {
        const threadState = getOrCreateThreadState(state, resolvedThreadId);
        threadState.messages = [];
        threadState.isProcessing = false;
      });
    },

    setMode: (mode: ChatMode, threadId) => {
      const resolvedThreadId = resolveThreadId(threadId);

      set((state) => {
        const threadState = getOrCreateThreadState(state, resolvedThreadId);
        threadState.mode = mode;
      });
    },

    setActiveMention: (target: MentionTarget | null, threadId) => {
      const resolvedThreadId = resolveThreadId(threadId);

      set((state) => {
        const threadState = getOrCreateThreadState(state, resolvedThreadId);
        threadState.activeMention = target;
      });
    },

    setInputDraft: (draft: string, threadId) => {
      const resolvedThreadId = resolveThreadId(threadId);

      set((state) => {
        const threadState = getOrCreateThreadState(state, resolvedThreadId);
        threadState.inputDraft = draft;
      });
    },
  })),
);

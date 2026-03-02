// ---------------------------------------------------------------------------
// chatStore.ts -- Zustand store for chat / conversation state in CopilotHub
// Manages messages, streaming, tool calls, and mention-based routing.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

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

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface ChatStore {
  // -- State --
  messages: ChatMessage[];
  mode: ChatMode;
  isProcessing: boolean;
  activeMention: MentionTarget | null;
  inputDraft: string;

  // -- Actions --
  sendMessage: (content: string) => void;
  appendStreamChunk: (messageId: string, chunk: string) => void;
  completeStream: (messageId: string) => void;
  addToolCall: (messageId: string, toolCall: ToolCall) => void;
  updateToolCall: (
    messageId: string,
    toolCallId: string,
    result: string,
  ) => void;
  clearMessages: () => void;
  setMode: (mode: ChatMode) => void;
  setActiveMention: (target: MentionTarget | null) => void;
  setInputDraft: (draft: string) => void;
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

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChatStore = create<ChatStore>()(
  immer((set) => ({
    // -- State ---------------------------------------------------------------
    messages: [],
    mode: 'chat' as ChatMode,
    isProcessing: false,
    activeMention: null,
    inputDraft: '',

    // -- Actions -------------------------------------------------------------

    sendMessage: (content: string) => {
      set((state) => {
        // 1. Append the user message
        const userMsg = createMessage('user', content);
        state.messages.push(userMsg);

        // 2. Create a placeholder assistant message for streaming
        const assistantMsg = createMessage('assistant', '');
        assistantMsg.isStreaming = true;
        state.messages.push(assistantMsg);

        // 3. Mark processing active and clear input draft
        state.isProcessing = true;
        state.inputDraft = '';
      });
    },

    appendStreamChunk: (messageId: string, chunk: string) => {
      set((state) => {
        const msg = state.messages.find((m) => m.id === messageId);
        if (msg && msg.isStreaming) {
          msg.content += chunk;
        }
      });
    },

    completeStream: (messageId: string) => {
      set((state) => {
        const msg = state.messages.find((m) => m.id === messageId);
        if (msg) {
          msg.isStreaming = false;
        }
        // If no messages are still streaming, processing is done
        const anyStreaming = state.messages.some((m) => m.isStreaming);
        if (!anyStreaming) {
          state.isProcessing = false;
        }
      });
    },

    addToolCall: (messageId: string, toolCall: ToolCall) => {
      set((state) => {
        const msg = state.messages.find((m) => m.id === messageId);
        if (msg) {
          msg.toolCalls.push(toolCall);
        }
      });
    },

    updateToolCall: (
      messageId: string,
      toolCallId: string,
      result: string,
    ) => {
      set((state) => {
        const msg = state.messages.find((m) => m.id === messageId);
        if (!msg) return;
        const tc = msg.toolCalls.find((t) => t.id === toolCallId);
        if (tc) {
          tc.result = result;
          tc.status = 'completed';
        }
      });
    },

    clearMessages: () => {
      set((state) => {
        state.messages = [];
        state.isProcessing = false;
      });
    },

    setMode: (mode: ChatMode) => {
      set((state) => {
        state.mode = mode;
      });
    },

    setActiveMention: (target: MentionTarget | null) => {
      set((state) => {
        state.activeMention = target;
      });
    },

    setInputDraft: (draft: string) => {
      set((state) => {
        state.inputDraft = draft;
      });
    },
  })),
);

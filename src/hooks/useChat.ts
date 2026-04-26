// ---------------------------------------------------------------------------
// useChat.ts -- Hook that bridges chatStore with eventBridge and actionMode.
// Registers Tauri event listeners on mount and routes sendMessage through
// the event bridge (chat mode) or MCP action parser (action mode).
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAppStore } from '../store/appStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';
import { eventBridge } from '../lib/eventBridge';
import { parseActionCommand, executeAction, formatActionResult } from '../lib/actionMode';
import mcpRegistry from '../lib/mcpRegistry';
import { isTauri } from '../lib/tauri';

export function useChat() {
  const selectedThreadId = useSessionEnvironmentStore((s) => s.selectedThreadId);
  const mode = useChatStore((s) => s.threadStateById[selectedThreadId ?? 'default-thread']?.mode ?? 'chat');
  const isProcessing = useChatStore(
    (s) => s.threadStateById[selectedThreadId ?? 'default-thread']?.isProcessing ?? false,
  );
  const initialized = useRef(false);

  // Register eventBridge listeners on mount (once per app lifetime).
  useEffect(() => {
    if (!isTauri) {
      return undefined;
    }

    if (initialized.current) return;
    initialized.current = true;

    // Listen for streaming response chunks from sidecar
    void eventBridge.onResponseChunk((payload) => {
      useChatStore.getState().appendStreamChunk(payload.messageId, payload.chunk);
    });

    void eventBridge.onResponseComplete((payload) => {
      useChatStore.getState().completeStream(payload.messageId);
    });

    void eventBridge.onToolCall((payload) => {
      useChatStore.getState().addToolCall(payload.messageId, {
        id: payload.toolCallId,
        name: payload.name,
        args: payload.args,
        result: '',
        status: 'pending',
      });
    });

    void eventBridge.onError((payload) => {
      const s = useChatStore.getState();
      s.appendStreamChunk(payload.messageId, `ERROR: ${payload.error}`);
      s.completeStream(payload.messageId);
    });

    return () => {
      eventBridge.cleanup();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Enhanced sendMessage that routes through eventBridge or actionMode
  // ---------------------------------------------------------------------------
  const sendMessage = async (content: string) => {
    const store = useChatStore.getState();
    const sessionState = useSessionEnvironmentStore.getState();
    const threadId = sessionState.selectedThreadId;
    const sessionId =
      (threadId ? sessionState.getThreadSession(threadId)?.id : null) ??
      sessionState.selectedSessionId ??
      undefined;

    // Always add user message + assistant placeholder to local state first.
    const assistantId = store.sendMessage(content, threadId);

    if (mode === 'action') {
      // Parse and execute MCP action
      const command = parseActionCommand(content);
      if (command) {
        const sidecarStatus = useAppStore.getState().sidecarStatus;
        if (sidecarStatus !== 'running') {
          store.appendStreamChunk(
            assistantId,
            'Sidecar is not running. Start it from the command palette (Ctrl+Shift+P) or Copilot Sidebar.',
            threadId,
          );
          store.completeStream(assistantId, threadId);
          return;
        }

        try {
          const result = await executeAction(command, mcpRegistry);
          const formatted = formatActionResult(result);
          store.appendStreamChunk(assistantId, formatted, threadId);
          store.completeStream(assistantId, threadId);
        } catch (err) {
          store.appendStreamChunk(assistantId, `Action failed: ${err}`, threadId);
          store.completeStream(assistantId, threadId);
        }
      } else {
        // Unrecognized action command
        store.appendStreamChunk(
          assistantId,
          'Unrecognized action command. Try: @browser navigate to <url>, @browser click <selector>, @terminal run <command>, @runbook run <name>',
          threadId,
        );
        store.completeStream(assistantId, threadId);
      }
    } else {
      // Chat mode: send via event bridge to sidecar for LLM processing
      try {
        await eventBridge.sendChatMessage({
          content,
          mode: 'chat',
          mention: useChatStore.getState().getThreadState(threadId).activeMention ?? undefined,
          messageId: assistantId,
          threadId: threadId ?? undefined,
          sessionId,
        });
      } catch (_err) {
        // If event bridge fails (no sidecar), provide a local fallback response.
        store.appendStreamChunk(
          assistantId,
          'Chat is running in local mode. Start the MCP sidecar for full AI-powered conversations. Use Ctrl+Shift+P and select "Start Sidecar".',
          threadId,
        );
        store.completeStream(assistantId, threadId);
      }
    }
  };

  return { sendMessage, mode, isProcessing };
}

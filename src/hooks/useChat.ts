// ---------------------------------------------------------------------------
// useChat.ts -- Hook that bridges chatStore with eventBridge and actionMode.
// Registers Tauri event listeners on mount and routes sendMessage through
// the event bridge (chat mode) or MCP action parser (action mode).
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAppStore } from '../store/appStore';
import { eventBridge } from '../lib/eventBridge';
import { parseActionCommand, executeAction, formatActionResult } from '../lib/actionMode';
import mcpRegistry from '../lib/mcpRegistry';

export function useChat() {
  const mode = useChatStore((s) => s.mode);
  const isProcessing = useChatStore((s) => s.isProcessing);
  const initialized = useRef(false);

  // Register eventBridge listeners on mount (once per app lifetime).
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const store = useChatStore.getState();

    // Listen for streaming response chunks from sidecar
    void eventBridge.onResponseChunk((payload) => {
      store.appendStreamChunk(payload.messageId, payload.chunk);
    });

    void eventBridge.onResponseComplete((payload) => {
      store.completeStream(payload.messageId);
    });

    void eventBridge.onToolCall((payload) => {
      store.addToolCall(payload.messageId, {
        id: payload.toolCallId,
        name: payload.name,
        args: payload.args,
        result: '',
        status: 'pending',
      });
    });

    void eventBridge.onError((payload) => {
      store.appendStreamChunk(payload.messageId, `ERROR: ${payload.error}`);
      store.completeStream(payload.messageId);
    });

    return () => {
      eventBridge.cleanup();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Helper: read the latest assistant message from the store.
  // Must be called AFTER sendMessage() so the immer-updated state is visible.
  // ---------------------------------------------------------------------------
  function getLatestAssistantId(): string {
    const msgs = useChatStore.getState().messages;
    const last = msgs[msgs.length - 1];
    if (!last) return crypto.randomUUID();
    return last.id;
  }

  // ---------------------------------------------------------------------------
  // Enhanced sendMessage that routes through eventBridge or actionMode
  // ---------------------------------------------------------------------------
  const sendMessage = async (content: string) => {
    const store = useChatStore.getState();

    // Always add user message + assistant placeholder to local state first.
    store.sendMessage(content);

    // Re-read state to get the freshly-created assistant message ID.
    // (store.messages above is stale after the immer set() inside sendMessage.)
    const assistantId = getLatestAssistantId();

    if (mode === 'action') {
      // Parse and execute MCP action
      const command = parseActionCommand(content);
      if (command) {
        const sidecarStatus = useAppStore.getState().sidecarStatus;
        if (sidecarStatus !== 'running') {
          store.appendStreamChunk(
            assistantId,
            'Sidecar is not running. Start it from the command palette (Ctrl+Shift+P) or Copilot Sidebar.',
          );
          store.completeStream(assistantId);
          return;
        }

        try {
          const result = await executeAction(command, mcpRegistry);
          const formatted = formatActionResult(result);
          store.appendStreamChunk(assistantId, formatted);
          store.completeStream(assistantId);
        } catch (err) {
          store.appendStreamChunk(assistantId, `Action failed: ${err}`);
          store.completeStream(assistantId);
        }
      } else {
        // Unrecognized action command
        store.appendStreamChunk(
          assistantId,
          'Unrecognized action command. Try: @browser navigate to <url>, @browser click <selector>, @terminal run <command>, @runbook run <name>',
        );
        store.completeStream(assistantId);
      }
    } else {
      // Chat mode: send via event bridge to sidecar for LLM processing
      try {
        await eventBridge.sendChatMessage({
          content,
          mode: 'chat',
          mention: useChatStore.getState().activeMention ?? undefined,
        });
      } catch (_err) {
        // If event bridge fails (no sidecar), provide a local fallback response.
        store.appendStreamChunk(
          assistantId,
          'Chat is running in local mode. Start the MCP sidecar for full AI-powered conversations. Use Ctrl+Shift+P and select "Start Sidecar".',
        );
        store.completeStream(assistantId);
      }
    }
  };

  return { sendMessage, mode, isProcessing };
}

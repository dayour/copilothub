// ---------------------------------------------------------------------------
// useChat.test.ts -- Unit tests for the useChat hook.
// Verifies event listener registration, chat-mode message routing through
// eventBridge, action-mode command parsing/execution, sidecar status gating,
// and error fallback behavior.
// ---------------------------------------------------------------------------

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import { useChatStore } from '../store/chatStore';
import { useAppStore } from '../store/appStore';

// ---------------------------------------------------------------------------
// Module mocks (hoisted by vitest before imports resolve)
// ---------------------------------------------------------------------------

vi.mock('../lib/eventBridge', () => ({
  eventBridge: {
    onResponseChunk: vi.fn().mockResolvedValue(undefined),
    onResponseComplete: vi.fn().mockResolvedValue(undefined),
    onToolCall: vi.fn().mockResolvedValue(undefined),
    onError: vi.fn().mockResolvedValue(undefined),
    sendChatMessage: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn(),
  },
}));

vi.mock('../lib/actionMode', () => ({
  parseActionCommand: vi.fn(),
  executeAction: vi.fn(),
  formatActionResult: vi.fn(),
}));

vi.mock('../lib/mcpRegistry', () => ({
  default: { callTool: vi.fn() },
}));

// Import mocked modules so we can configure return values and assert calls.
import { eventBridge } from '../lib/eventBridge';
import {
  parseActionCommand,
  executeAction,
  formatActionResult,
} from '../lib/actionMode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the last message in the chat store (typically the assistant placeholder). */
function lastAssistantMessage() {
  const msgs = useChatStore.getState().messages;
  return msgs[msgs.length - 1];
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset both stores to a clean baseline before every test.
    useChatStore.setState({
      messages: [],
      mode: 'chat',
      isProcessing: false,
      inputDraft: '',
      activeMention: null,
    });
    useAppStore.setState({
      theme: 'dark',
      sidebarPosition: 'left',
      verticalTabsEnabled: false,
      sidecarStatus: 'stopped',
      commandPaletteOpen: false,
      copilotSidebarOpen: false,
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. Return shape
  // -----------------------------------------------------------------------

  it('returns sendMessage function, mode, and isProcessing flag', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current).toHaveProperty('sendMessage');
    expect(typeof result.current.sendMessage).toBe('function');
    expect(result.current).toHaveProperty('mode');
    expect(result.current.mode).toBe('chat');
    expect(result.current).toHaveProperty('isProcessing');
    expect(result.current.isProcessing).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 2. Event listener registration
  // -----------------------------------------------------------------------

  it('registers event listeners on mount', () => {
    renderHook(() => useChat());

    expect(eventBridge.onResponseChunk).toHaveBeenCalledTimes(1);
    expect(eventBridge.onResponseComplete).toHaveBeenCalledTimes(1);
    expect(eventBridge.onToolCall).toHaveBeenCalledTimes(1);
    expect(eventBridge.onError).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 3. Chat mode -- successful send
  // -----------------------------------------------------------------------

  it('sendMessage in chat mode emits via eventBridge', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello world');
    });

    expect(eventBridge.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(eventBridge.sendChatMessage).toHaveBeenCalledWith({
      content: 'Hello world',
      mode: 'chat',
      mention: undefined,
    });
  });

  // -----------------------------------------------------------------------
  // 4. Chat mode -- activeMention forwarded
  // -----------------------------------------------------------------------

  it('sendMessage in chat mode passes activeMention to eventBridge', async () => {
    useChatStore.setState({ activeMention: '@browser' });
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('navigate to github');
    });

    expect(eventBridge.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ mention: '@browser' }),
    );
  });

  // -----------------------------------------------------------------------
  // 5. Chat mode -- fallback on emit failure
  // -----------------------------------------------------------------------

  it('sendMessage in chat mode shows fallback on emit failure', async () => {
    vi.mocked(eventBridge.sendChatMessage).mockRejectedValueOnce(
      new Error('sidecar unavailable'),
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    const msgs = useChatStore.getState().messages;
    // sendMessage always pushes user msg + assistant placeholder = 2 messages.
    expect(msgs.length).toBe(2);

    const assistant = lastAssistantMessage();
    expect(assistant.role).toBe('assistant');
    expect(assistant.content).toContain('local mode');
    expect(assistant.content).toContain('Start the MCP sidecar');
    expect(assistant.isStreaming).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 6. Action mode -- parseActionCommand called
  // -----------------------------------------------------------------------

  it('sendMessage in action mode parses command', async () => {
    useChatStore.setState({ mode: 'action' });
    vi.mocked(parseActionCommand).mockReturnValue(null);

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('@browser navigate to http://test.com');
    });

    expect(parseActionCommand).toHaveBeenCalledWith(
      '@browser navigate to http://test.com',
    );
  });

  // -----------------------------------------------------------------------
  // 7. Action mode -- sidecar not running
  // -----------------------------------------------------------------------

  it('sendMessage in action mode checks sidecar status', async () => {
    useChatStore.setState({ mode: 'action' });
    useAppStore.setState({ sidecarStatus: 'stopped' });

    vi.mocked(parseActionCommand).mockReturnValue({
      tool: 'browser_navigate',
      args: { url: 'http://test.com' },
      raw: '@browser navigate to http://test.com',
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('@browser navigate to http://test.com');
    });

    // executeAction should never have been called.
    expect(executeAction).not.toHaveBeenCalled();

    const assistant = lastAssistantMessage();
    expect(assistant.content).toContain('Sidecar is not running');
    expect(assistant.isStreaming).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 8. Action mode -- sidecar running, successful execution
  // -----------------------------------------------------------------------

  it('sendMessage in action mode executes when sidecar running', async () => {
    useChatStore.setState({ mode: 'action' });
    useAppStore.setState({ sidecarStatus: 'running' });

    vi.mocked(parseActionCommand).mockReturnValue({
      tool: 'browser_navigate',
      args: { url: 'http://test.com' },
      raw: '@browser navigate to http://test.com',
    });
    vi.mocked(executeAction).mockResolvedValue({
      success: true,
      output: 'Navigated to http://test.com',
    });
    vi.mocked(formatActionResult).mockReturnValue(
      'Action completed successfully.\nNavigated to http://test.com',
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('@browser navigate to http://test.com');
    });

    expect(executeAction).toHaveBeenCalledTimes(1);
    expect(formatActionResult).toHaveBeenCalledWith({
      success: true,
      output: 'Navigated to http://test.com',
    });

    const assistant = lastAssistantMessage();
    expect(assistant.content).toContain('Action completed successfully');
    expect(assistant.content).toContain('Navigated to http://test.com');
    expect(assistant.isStreaming).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 9. Action mode -- unrecognized command shows help
  // -----------------------------------------------------------------------

  it('sendMessage with unrecognized action shows help', async () => {
    useChatStore.setState({ mode: 'action' });
    vi.mocked(parseActionCommand).mockReturnValue(null);

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('do something random');
    });

    const assistant = lastAssistantMessage();
    expect(assistant.content).toContain('Unrecognized action command');
    expect(assistant.content).toContain('@browser navigate');
    expect(assistant.content).toContain('@terminal run');
    expect(assistant.content).toContain('@runbook run');
    expect(assistant.isStreaming).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 10. Action mode -- execution error caught gracefully
  // -----------------------------------------------------------------------

  it('sendMessage in action mode handles execution errors', async () => {
    useChatStore.setState({ mode: 'action' });
    useAppStore.setState({ sidecarStatus: 'running' });

    vi.mocked(parseActionCommand).mockReturnValue({
      tool: 'browser_navigate',
      args: { url: 'http://bad.url' },
      raw: '@browser navigate to http://bad.url',
    });
    vi.mocked(executeAction).mockRejectedValue(
      new Error('Connection refused'),
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('@browser navigate to http://bad.url');
    });

    const assistant = lastAssistantMessage();
    expect(assistant.content).toContain('Action failed');
    expect(assistant.isStreaming).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 11. sendMessage always adds user + assistant messages to store
  // -----------------------------------------------------------------------

  it('sendMessage always appends user and assistant messages to store', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('test message');
    });

    const msgs = useChatStore.getState().messages;
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('test message');
    expect(msgs[1].role).toBe('assistant');
  });
});

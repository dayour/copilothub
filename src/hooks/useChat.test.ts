import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import { useChatStore } from '../store/chatStore';
import { useAppStore } from '../store/appStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';
import { createDefaultSessionEnvironment } from '../lib/sessionEnvironment';
import {
  createSessionThread,
  getDefaultThreadTitle,
} from '../lib/sessionThread';

const eventBridgeMock = vi.hoisted(() => {
  const listeners: {
    responseChunk?: (payload: { messageId: string; chunk: string }) => void;
    responseComplete?: (payload: { messageId: string }) => void;
    toolCall?: (
      payload: {
        messageId: string;
        toolCallId: string;
        name: string;
        args: Record<string, unknown>;
      },
    ) => void;
    error?: (payload: { messageId: string; error: string }) => void;
  } = {};

  return {
    listeners,
    bridge: {
      onResponseChunk: vi.fn().mockImplementation(async (callback) => {
        listeners.responseChunk = callback;
      }),
      onResponseComplete: vi.fn().mockImplementation(async (callback) => {
        listeners.responseComplete = callback;
      }),
      onToolCall: vi.fn().mockImplementation(async (callback) => {
        listeners.toolCall = callback;
      }),
      onError: vi.fn().mockImplementation(async (callback) => {
        listeners.error = callback;
      }),
      sendChatMessage: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn(),
    },
  };
});

vi.mock('../lib/eventBridge', () => ({
  eventBridge: eventBridgeMock.bridge,
}));

vi.mock('../lib/tauri', () => ({
  isTauri: true,
}));

vi.mock('../lib/actionMode', () => ({
  parseActionCommand: vi.fn(),
  executeAction: vi.fn(),
  formatActionResult: vi.fn(),
}));

vi.mock('../lib/mcpRegistry', () => ({
  default: { callTool: vi.fn() },
}));

import { eventBridge } from '../lib/eventBridge';
import {
  parseActionCommand,
  executeAction,
  formatActionResult,
} from '../lib/actionMode';

function seedStores() {
  const session = createDefaultSessionEnvironment('E:\\copilothub');
  const thread = createSessionThread({
    projectPath: session.projectPath,
    sessionEnvironmentId: session.id,
    title: getDefaultThreadTitle(session.projectPath),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });

  useSessionEnvironmentStore.setState({
    sessions: [session],
    selectedSessionId: session.id,
    threads: [thread],
    selectedThreadId: thread.id,
  });

  useChatStore.setState({
    threadStateById: {},
  });

  useAppStore.setState({
    theme: 'dark',
    sidebarPosition: 'left',
    verticalTabsEnabled: false,
    projectSidebarCollapsed: false,
    currentProjectPath: null,
    recentProjects: [],
    sidecarStatus: 'stopped',
    isAuthenticated: false,
    commandPaletteOpen: false,
    copilotSidebarOpen: false,
    showActionOverlay: true,
    browserUseAutoScreenshot: true,
    browserUseMaxSteps: 50,
    connectedSdkSession: null,
    actionTimelineDocked: 'right',
  });

  return { session, threadId: thread.id };
}

function lastAssistantMessage(threadId: string) {
  const msgs = useChatStore.getState().getThreadState(threadId).messages;
  return msgs[msgs.length - 1];
}

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBridgeMock.listeners.responseChunk = undefined;
    eventBridgeMock.listeners.responseComplete = undefined;
    eventBridgeMock.listeners.toolCall = undefined;
    eventBridgeMock.listeners.error = undefined;
    seedStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sendMessage function, mode, and isProcessing flag', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current).toHaveProperty('sendMessage');
    expect(typeof result.current.sendMessage).toBe('function');
    expect(result.current.mode).toBe('chat');
    expect(result.current.isProcessing).toBe(false);
  });

  it('registers event listeners on mount', () => {
    renderHook(() => useChat());

    expect(eventBridge.onResponseChunk).toHaveBeenCalledTimes(1);
    expect(eventBridge.onResponseComplete).toHaveBeenCalledTimes(1);
    expect(eventBridge.onToolCall).toHaveBeenCalledTimes(1);
    expect(eventBridge.onError).toHaveBeenCalledTimes(1);
  });

  it('sendMessage in chat mode emits via eventBridge', async () => {
    const { threadId } = seedStores();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello world');
    });

    expect(eventBridge.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(eventBridge.sendChatMessage).toHaveBeenCalledWith({
      content: 'Hello world',
      mode: 'chat',
      mention: undefined,
      messageId: expect.any(String),
      threadId,
      sessionId: useSessionEnvironmentStore.getState().selectedSessionId ?? undefined,
    });
    expect(useChatStore.getState().getThreadState(threadId).messages).toHaveLength(2);
  });

  it('sendMessage in chat mode passes thread mention to eventBridge', async () => {
    const { threadId } = seedStores();
    useChatStore.getState().setActiveMention('@browser', threadId);
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('navigate to github');
    });

    expect(eventBridge.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        mention: '@browser',
        messageId: expect.any(String),
        threadId,
        sessionId: useSessionEnvironmentStore.getState().selectedSessionId ?? undefined,
      }),
    );
  });

  it('sendMessage uses the session linked to the selected thread for correlation', async () => {
    const { session } = seedStores();
    const secondThread = useSessionEnvironmentStore.getState().createThread({
      projectPath: 'E:\\copilothub',
      title: 'Thread 2',
    });
    useSessionEnvironmentStore.setState({
      selectedThreadId: secondThread.id,
      selectedSessionId: session.id,
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Correlate this thread');
    });

    expect(eventBridge.sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: secondThread.id,
        sessionId: secondThread.sessionEnvironmentId,
      }),
    );
  });

  it('sendMessage in chat mode shows fallback on emit failure', async () => {
    const { threadId } = seedStores();
    vi.mocked(eventBridge.sendChatMessage).mockRejectedValueOnce(
      new Error('sidecar unavailable'),
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    const msgs = useChatStore.getState().getThreadState(threadId).messages;
    expect(msgs.length).toBe(2);

    const assistant = lastAssistantMessage(threadId);
    expect(assistant.role).toBe('assistant');
    expect(assistant.content).toContain('local mode');
    expect(assistant.content).toContain('Start the MCP sidecar');
    expect(assistant.isStreaming).toBe(false);
  });

  it('routes stream updates by messageId even after the selected thread changes', async () => {
    const { threadId } = seedStores();
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('First thread request');
    });

    const sentPayload = vi.mocked(eventBridge.sendChatMessage).mock.calls[0]?.[0];
    expect(sentPayload?.threadId).toBe(threadId);
    expect(sentPayload?.messageId).toEqual(expect.any(String));

    let secondThread!: { id: string };
    act(() => {
      secondThread = useSessionEnvironmentStore.getState().createThread({
        projectPath: 'E:\\copilothub',
        title: 'Thread 2',
      });
    });
    act(() => {
      useSessionEnvironmentStore.getState().selectThread(secondThread.id);
    });

    act(() => {
      eventBridgeMock.listeners.responseChunk?.({
        messageId: sentPayload?.messageId as string,
        chunk: 'Streaming reply',
      });
      eventBridgeMock.listeners.toolCall?.({
        messageId: sentPayload?.messageId as string,
        toolCallId: 'tool-1',
        name: 'search',
        args: { q: 'correlation' },
      });
      eventBridgeMock.listeners.responseComplete?.({
        messageId: sentPayload?.messageId as string,
      });
    });

    const originalThreadAssistant = lastAssistantMessage(threadId);
    const secondThreadState = useChatStore.getState().getThreadState(secondThread.id);

    expect(originalThreadAssistant.content).toBe('Streaming reply');
    expect(originalThreadAssistant.isStreaming).toBe(false);
    expect(originalThreadAssistant.toolCalls).toEqual([
      {
        id: 'tool-1',
        name: 'search',
        args: { q: 'correlation' },
        result: '',
        status: 'pending',
      },
    ]);
    expect(useChatStore.getState().getThreadState(threadId).isProcessing).toBe(false);
    expect(secondThreadState.messages).toEqual([]);
    expect(secondThreadState.isProcessing).toBe(false);
  });

  it('sendMessage in action mode parses commands', async () => {
    useChatStore.getState().setMode('action');
    vi.mocked(parseActionCommand).mockReturnValue(null);

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('@browser navigate to http://test.com');
    });

    expect(parseActionCommand).toHaveBeenCalledWith(
      '@browser navigate to http://test.com',
    );
  });

  it('sendMessage in action mode checks sidecar status', async () => {
    const { threadId } = seedStores();
    useChatStore.getState().setMode('action', threadId);
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

    expect(executeAction).not.toHaveBeenCalled();

    const assistant = lastAssistantMessage(threadId);
    expect(assistant.content).toContain('Sidecar is not running');
    expect(assistant.isStreaming).toBe(false);
  });

  it('sendMessage in action mode executes when sidecar is running', async () => {
    const { threadId } = seedStores();
    useChatStore.getState().setMode('action', threadId);
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

    const assistant = lastAssistantMessage(threadId);
    expect(assistant.content).toContain('Action completed successfully');
    expect(assistant.content).toContain('Navigated to http://test.com');
    expect(assistant.isStreaming).toBe(false);
  });

  it('sendMessage with unrecognized action shows help', async () => {
    const { threadId } = seedStores();
    useChatStore.getState().setMode('action', threadId);
    vi.mocked(parseActionCommand).mockReturnValue(null);

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('do something random');
    });

    const assistant = lastAssistantMessage(threadId);
    expect(assistant.content).toContain('Unrecognized action command');
    expect(assistant.content).toContain('@browser navigate');
    expect(assistant.content).toContain('@terminal run');
    expect(assistant.content).toContain('@runbook run');
    expect(assistant.isStreaming).toBe(false);
  });

  it('sendMessage in action mode handles execution errors', async () => {
    const { threadId } = seedStores();
    useChatStore.getState().setMode('action', threadId);
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

    const assistant = lastAssistantMessage(threadId);
    expect(assistant.content).toContain('Action failed');
    expect(assistant.isStreaming).toBe(false);
  });

  it('sendMessage appends user and assistant messages to the selected thread', async () => {
    const { threadId } = seedStores();
    const secondThread = useSessionEnvironmentStore.getState().createThread({
      projectPath: 'E:\\copilothub',
      title: 'Thread 2',
    });
    useSessionEnvironmentStore.getState().selectThread(secondThread.id);

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('test message');
    });

    const selectedThreadMessages = useChatStore.getState().getThreadState(secondThread.id).messages;
    const otherThreadMessages = useChatStore.getState().getThreadState(threadId).messages;

    expect(selectedThreadMessages.length).toBe(2);
    expect(selectedThreadMessages[0].role).toBe('user');
    expect(selectedThreadMessages[0].content).toBe('test message');
    expect(selectedThreadMessages[1].role).toBe('assistant');
    expect(otherThreadMessages).toEqual([]);
  });
});

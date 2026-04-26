import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore, type ToolCall } from './chatStore';
import { useSessionEnvironmentStore } from './sessionEnvironmentStore';
import { createDefaultSessionEnvironment } from '../lib/sessionEnvironment';
import {
  createSessionThread,
  getDefaultThreadTitle,
} from '../lib/sessionThread';

const WORKSPACE_PATH = 'E:\\copilothub';

function seedStores() {
  const session = createDefaultSessionEnvironment(WORKSPACE_PATH);
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

  return { session, thread };
}

describe('chatStore', () => {
  beforeEach(() => {
    seedStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initial state has no messages, chat mode, and not processing', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThreadId;
    const state = useChatStore.getState().getThreadState(threadId);

    expect(state.messages).toEqual([]);
    expect(state.mode).toBe('chat');
    expect(state.isProcessing).toBe(false);
  });

  it('sendMessage adds user and assistant messages and clears the active draft', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThreadId;
    const store = useChatStore.getState();

    store.setInputDraft('draft', threadId);
    const assistantId = store.sendMessage('hello', threadId);

    const state = useChatStore.getState().getThreadState(threadId);
    expect(assistantId).toBeTruthy();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[0].content).toBe('hello');
    expect(state.messages[1].role).toBe('assistant');
    expect(state.messages[1].id).toBe(assistantId);
    expect(state.messages[1].isStreaming).toBe(true);
    expect(state.isProcessing).toBe(true);
    expect(state.inputDraft).toBe('');
  });

  it('appendStreamChunk and completeStream update the active thread only', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThreadId;
    const store = useChatStore.getState();
    const assistantId = store.sendMessage('question', threadId);

    store.appendStreamChunk(assistantId, 'Hello', threadId);
    store.appendStreamChunk(assistantId, ' world', threadId);
    store.completeStream(assistantId, threadId);

    const state = useChatStore.getState().getThreadState(threadId);
    expect(state.messages[1].content).toBe('Hello world');
    expect(state.messages[1].isStreaming).toBe(false);
    expect(state.isProcessing).toBe(false);
  });

  it('addToolCall and updateToolCall mutate the matching assistant message', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThreadId;
    const store = useChatStore.getState();
    const assistantId = store.sendMessage('use tool', threadId);
    const call: ToolCall = {
      id: 'tool-1',
      name: 'search',
      args: { q: 'zustand' },
      result: '',
      status: 'running',
    };

    store.addToolCall(assistantId, call, threadId);
    store.updateToolCall(assistantId, 'tool-1', 'done', threadId);

    const toolCalls = useChatStore.getState().getThreadState(threadId).messages[1].toolCalls;
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toEqual({
      ...call,
      result: 'done',
      status: 'completed',
    });
  });

  it('clearMessages resets only the targeted thread', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThreadId;
    const store = useChatStore.getState();

    store.sendMessage('hello', threadId);
    expect(useChatStore.getState().getThreadState(threadId).isProcessing).toBe(true);

    store.clearMessages(threadId);

    const state = useChatStore.getState().getThreadState(threadId);
    expect(state.messages).toEqual([]);
    expect(state.isProcessing).toBe(false);
  });

  it('stores mode, mention, and draft independently per thread', () => {
    const primaryThreadId = useSessionEnvironmentStore.getState().selectedThreadId as string;
    const secondThread = useSessionEnvironmentStore.getState().createThread({
      projectPath: WORKSPACE_PATH,
      title: 'Thread 2',
    });
    const store = useChatStore.getState();

    store.setMode('action', primaryThreadId);
    store.setActiveMention('@browser', primaryThreadId);
    store.setInputDraft('draft one', primaryThreadId);

    store.setMode('chat', secondThread.id);
    store.setActiveMention('@terminal', secondThread.id);
    store.setInputDraft('draft two', secondThread.id);

    const primaryState = useChatStore.getState().getThreadState(primaryThreadId);
    const secondaryState = useChatStore.getState().getThreadState(secondThread.id);

    expect(primaryState.mode).toBe('action');
    expect(primaryState.activeMention).toBe('@browser');
    expect(primaryState.inputDraft).toBe('draft one');

    expect(secondaryState.mode).toBe('chat');
    expect(secondaryState.activeMention).toBe('@terminal');
    expect(secondaryState.inputDraft).toBe('draft two');
  });

  it('keeps messages isolated across parallel threads', () => {
    const primaryThreadId = useSessionEnvironmentStore.getState().selectedThreadId as string;
    const secondThread = useSessionEnvironmentStore.getState().createThread({
      projectPath: WORKSPACE_PATH,
      title: 'Thread 2',
    });
    const store = useChatStore.getState();

    store.sendMessage('thread one message', primaryThreadId);
    store.sendMessage('thread two message', secondThread.id);

    const primaryState = useChatStore.getState().getThreadState(primaryThreadId);
    const secondaryState = useChatStore.getState().getThreadState(secondThread.id);

    expect(primaryState.messages[0].content).toBe('thread one message');
    expect(secondaryState.messages[0].content).toBe('thread two message');
    expect(primaryState.messages).toHaveLength(2);
    expect(secondaryState.messages).toHaveLength(2);
  });

  it('processing stays true while another message is still streaming in the same thread', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThreadId;
    const store = useChatStore.getState();

    const firstAssistantId = store.sendMessage('first', threadId);
    const secondAssistantId = store.sendMessage('second', threadId);

    store.completeStream(firstAssistantId, threadId);
    expect(useChatStore.getState().getThreadState(threadId).isProcessing).toBe(true);

    store.completeStream(secondAssistantId, threadId);
    expect(useChatStore.getState().getThreadState(threadId).isProcessing).toBe(false);
  });

  it('message-targeted operations are safe no-ops for unknown ids', () => {
    const threadId = useSessionEnvironmentStore.getState().selectedThreadId;
    const store = useChatStore.getState();

    store.sendMessage('test', threadId);
    const before = useChatStore.getState().getThreadState(threadId).messages.length;

    store.appendStreamChunk('nonexistent-id', 'chunk', threadId);
    store.addToolCall('nonexistent-id', {
      id: 'tc1',
      name: 'test',
      args: {},
      result: '',
      status: 'pending',
    }, threadId);
    store.updateToolCall('nonexistent-msg', 'tc1', 'result', threadId);

    expect(useChatStore.getState().getThreadState(threadId).messages.length).toBe(before);
  });
});

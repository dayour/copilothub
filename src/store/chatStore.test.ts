import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore, type ToolCall } from './chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      mode: 'chat',
      isProcessing: false,
      activeMention: null,
      inputDraft: '',
    });
  });

  it('initial state has no messages, chat mode, and not processing', () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.mode).toBe('chat');
    expect(state.isProcessing).toBe(false);
  });

  it('sendMessage adds user + placeholder assistant message and sets processing', () => {
    const store = useChatStore.getState();
    store.setInputDraft('draft');
    store.sendMessage('hello');

    const { messages, isProcessing, inputDraft } = useChatStore.getState();
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('hello');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('');
    expect(messages[1].isStreaming).toBe(true);
    expect(isProcessing).toBe(true);
    expect(inputDraft).toBe('');
  });

  it('appendStreamChunk appends text to target streaming message', () => {
    const store = useChatStore.getState();
    store.sendMessage('question');
    const assistantId = useChatStore.getState().messages[1].id;

    store.appendStreamChunk(assistantId, 'Hello');
    store.appendStreamChunk(assistantId, ' world');

    expect(useChatStore.getState().messages[1].content).toBe('Hello world');
  });

  it('completeStream marks message done and clears processing when none still streaming', () => {
    const store = useChatStore.getState();
    store.sendMessage('question');
    const assistantId = useChatStore.getState().messages[1].id;

    store.completeStream(assistantId);

    const state = useChatStore.getState();
    expect(state.messages[1].isStreaming).toBe(false);
    expect(state.isProcessing).toBe(false);
  });

  it('addToolCall appends tool call to specified message', () => {
    const store = useChatStore.getState();
    store.sendMessage('use tool');
    const assistantId = useChatStore.getState().messages[1].id;
    const call: ToolCall = {
      id: 'tool-1',
      name: 'search',
      args: { q: 'zustand' },
      result: '',
      status: 'running',
    };

    store.addToolCall(assistantId, call);

    const toolCalls = useChatStore.getState().messages[1].toolCalls;
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0]).toEqual(call);
  });

  it('updateToolCall updates tool call result and status', () => {
    const store = useChatStore.getState();
    store.sendMessage('use tool');
    const assistantId = useChatStore.getState().messages[1].id;
    store.addToolCall(assistantId, {
      id: 'tool-1',
      name: 'search',
      args: {},
      result: '',
      status: 'running',
    });

    store.updateToolCall(assistantId, 'tool-1', 'done');

    const tc = useChatStore.getState().messages[1].toolCalls[0];
    expect(tc.result).toBe('done');
    expect(tc.status).toBe('completed');
  });

  it('clearMessages empties messages and resets processing state', () => {
    const store = useChatStore.getState();
    store.sendMessage('hello');
    expect(useChatStore.getState().isProcessing).toBe(true);

    store.clearMessages();

    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isProcessing).toBe(false);
  });

  it("setMode switches between 'chat' and 'action'", () => {
    const store = useChatStore.getState();
    store.setMode('action');
    expect(useChatStore.getState().mode).toBe('action');
    store.setMode('chat');
    expect(useChatStore.getState().mode).toBe('chat');
  });

  it('setActiveMention sets and clears mention target', () => {
    const store = useChatStore.getState();
    store.setActiveMention('@browser');
    expect(useChatStore.getState().activeMention).toBe('@browser');
    store.setActiveMention(null);
    expect(useChatStore.getState().activeMention).toBeNull();
  });

  it('setInputDraft updates draft text', () => {
    useChatStore.getState().setInputDraft('hello draft');
    expect(useChatStore.getState().inputDraft).toBe('hello draft');
  });

  it('streaming race: processing stays true while another message is still streaming', () => {
    const store = useChatStore.getState();
    store.sendMessage('first');
    store.sendMessage('second');

    const assistantIds = useChatStore
      .getState()
      .messages.filter((m) => m.role === 'assistant')
      .map((m) => m.id);

    store.completeStream(assistantIds[0]);
    expect(useChatStore.getState().isProcessing).toBe(true);

    store.completeStream(assistantIds[1]);
    expect(useChatStore.getState().isProcessing).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emit, listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

import {
  CHAT_ERROR,
  CHAT_RESPONSE_CHUNK,
  CHAT_RESPONSE_COMPLETE,
  CHAT_SEND,
  CHAT_TOOL_CALL,
  SIDECAR_STATUS,
  createEventBridge,
} from './eventBridge';

describe('EventBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sendChatMessage emits event', async () => {
    const bridge = createEventBridge();
    const payload = { content: 'Hello', mode: 'chat' as const, mention: '@copilot' };

    await bridge.sendChatMessage(payload);

    expect(emit).toHaveBeenCalledWith(CHAT_SEND, payload);
  });

  it('onResponseChunk registers listener', async () => {
    const bridge = createEventBridge();

    await bridge.onResponseChunk(vi.fn());

    expect(listen).toHaveBeenCalledWith(CHAT_RESPONSE_CHUNK, expect.any(Function));
  });

  it('onResponseComplete registers listener', async () => {
    const bridge = createEventBridge();

    await bridge.onResponseComplete(vi.fn());

    expect(listen).toHaveBeenCalledWith(CHAT_RESPONSE_COMPLETE, expect.any(Function));
  });

  it('onToolCall registers listener', async () => {
    const bridge = createEventBridge();

    await bridge.onToolCall(vi.fn());

    expect(listen).toHaveBeenCalledWith(CHAT_TOOL_CALL, expect.any(Function));
  });

  it('onError registers listener', async () => {
    const bridge = createEventBridge();

    await bridge.onError(vi.fn());

    expect(listen).toHaveBeenCalledWith(CHAT_ERROR, expect.any(Function));
  });

  it('onSidecarStatus registers listener', async () => {
    const bridge = createEventBridge();

    await bridge.onSidecarStatus(vi.fn());

    expect(listen).toHaveBeenCalledWith(SIDECAR_STATUS, expect.any(Function));
  });

  it('cleanup unregisters all listeners', async () => {
    const bridge = createEventBridge();
    const unlistenA = vi.fn();
    const unlistenB = vi.fn();
    const unlistenC = vi.fn();

    vi.mocked(listen)
      .mockResolvedValueOnce(unlistenA)
      .mockResolvedValueOnce(unlistenB)
      .mockResolvedValueOnce(unlistenC);

    await bridge.onResponseChunk(vi.fn());
    await bridge.onError(vi.fn());
    await bridge.onSidecarStatus(vi.fn());

    bridge.cleanup();

    expect(unlistenA).toHaveBeenCalledTimes(1);
    expect(unlistenB).toHaveBeenCalledTimes(1);
    expect(unlistenC).toHaveBeenCalledTimes(1);
  });

  it('cleanup is idempotent', async () => {
    const bridge = createEventBridge();
    const unlisten = vi.fn();
    vi.mocked(listen).mockResolvedValueOnce(unlisten);
    await bridge.onResponseChunk(vi.fn());

    expect(() => {
      bridge.cleanup();
      bridge.cleanup();
    }).not.toThrow();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it('startSidecar calls invoke', async () => {
    const bridge = createEventBridge();

    await bridge.startSidecar();

    expect(invoke).toHaveBeenCalledWith('start_sidecar');
  });

  it('stopSidecar calls invoke', async () => {
    const bridge = createEventBridge();

    await bridge.stopSidecar();

    expect(invoke).toHaveBeenCalledWith('stop_sidecar');
  });

  it('getSidecarStatus calls invoke', async () => {
    const bridge = createEventBridge();

    await bridge.getSidecarStatus();

    expect(invoke).toHaveBeenCalledWith('sidecar_status');
  });

  it('sendChatMessage handles emit failure gracefully', async () => {
    const bridge = createEventBridge();
    const { emit } = await import('@tauri-apps/api/event');
    vi.mocked(emit).mockRejectedValueOnce(new Error('emit failed'));
    await expect(bridge.sendChatMessage({ content: 'test', mode: 'chat' })).rejects.toThrow();
  });
});

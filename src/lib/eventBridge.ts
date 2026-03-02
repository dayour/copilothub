import { listen, emit, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

export const CHAT_SEND = 'chat:send';
export const CHAT_RESPONSE_CHUNK = 'chat:response-chunk';
export const CHAT_RESPONSE_COMPLETE = 'chat:response-complete';
export const CHAT_TOOL_CALL = 'chat:tool-call';
export const CHAT_ERROR = 'chat:error';
export const SIDECAR_STATUS = 'sidecar:status';

export interface ChatSendPayload {
  content: string;
  mode: 'chat' | 'action';
  mention?: string;
}

export interface ChatChunkPayload {
  messageId: string;
  chunk: string;
}

export interface ChatCompletePayload {
  messageId: string;
}

export interface ChatToolCallPayload {
  messageId: string;
  toolCallId: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ChatErrorPayload {
  messageId: string;
  error: string;
}

export class EventBridge {
  private listeners: UnlistenFn[] = [];

  async sendChatMessage(payload: ChatSendPayload): Promise<void> {
    await emit(CHAT_SEND, payload);
  }

  async onResponseChunk(callback: (payload: ChatChunkPayload) => void): Promise<void> {
    const unlisten = await listen<ChatChunkPayload>(CHAT_RESPONSE_CHUNK, (event) => {
      callback(event.payload);
    });
    this.listeners.push(unlisten);
  }

  async onResponseComplete(callback: (payload: ChatCompletePayload) => void): Promise<void> {
    const unlisten = await listen<ChatCompletePayload>(CHAT_RESPONSE_COMPLETE, (event) => {
      callback(event.payload);
    });
    this.listeners.push(unlisten);
  }

  async onToolCall(callback: (payload: ChatToolCallPayload) => void): Promise<void> {
    const unlisten = await listen<ChatToolCallPayload>(CHAT_TOOL_CALL, (event) => {
      callback(event.payload);
    });
    this.listeners.push(unlisten);
  }

  async onError(callback: (payload: ChatErrorPayload) => void): Promise<void> {
    const unlisten = await listen<ChatErrorPayload>(CHAT_ERROR, (event) => {
      callback(event.payload);
    });
    this.listeners.push(unlisten);
  }

  async onSidecarStatus(callback: (status: string) => void): Promise<void> {
    const unlisten = await listen<string>(SIDECAR_STATUS, (event) => {
      callback(event.payload);
    });
    this.listeners.push(unlisten);
  }

  async startSidecar(): Promise<string> {
    return invoke<string>('start_sidecar');
  }

  async stopSidecar(): Promise<string> {
    return invoke<string>('stop_sidecar');
  }

  async getSidecarStatus(): Promise<string> {
    return invoke<string>('sidecar_status');
  }

  cleanup(): void {
    for (const unlisten of this.listeners) {
      unlisten();
    }
    this.listeners = [];
  }
}

export const eventBridge = new EventBridge();

export function createEventBridge(): EventBridge {
  return new EventBridge();
}

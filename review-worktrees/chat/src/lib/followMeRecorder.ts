// ---------------------------------------------------------------------------
// followMeRecorder.ts -- Wrapper around the copilotbrowser MCP follow-me
// recording tools for CopilotHub. Manages recording lifecycle, replay, and
// persistence of generated automation code.
// ---------------------------------------------------------------------------

import mcpClient from './mcpClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecordingStatus = 'idle' | 'recording' | 'stopping' | 'replaying';

export interface Recording {
  id: string;
  name: string;
  startedAt: number;
  stoppedAt?: number;
  /** The generated replay code returned by browser_follow_me_stop. */
  code?: string;
  status: RecordingStatus;
}

// ---------------------------------------------------------------------------
// FollowMeRecorder
// ---------------------------------------------------------------------------

export class FollowMeRecorder {
  private currentRecording: Recording | null = null;
  private savedRecordings: Recording[] = [];
  private listeners: Set<(recording: Recording | null) => void> = new Set();

  // -------------------------------------------------------------------------
  // Subscription
  // -------------------------------------------------------------------------

  /** Subscribe to recording state changes. Returns an unsubscribe function. */
  onChange(listener: (recording: Recording | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  /** Get the current recording state (null when idle with no active recording). */
  getCurrent(): Recording | null {
    return this.currentRecording;
  }

  /** Whether a recording session is currently active. */
  isRecording(): boolean {
    return this.currentRecording?.status === 'recording';
  }

  /** Get all saved recordings (completed recordings with replay code). */
  getSavedRecordings(): Recording[] {
    return [...this.savedRecordings];
  }

  // -------------------------------------------------------------------------
  // Recording lifecycle
  // -------------------------------------------------------------------------

  /** Start recording browser interactions. */
  async startRecording(name?: string): Promise<Recording> {
    if (this.currentRecording?.status === 'recording') {
      throw new Error('A recording is already in progress');
    }

    const recording: Recording = {
      id: crypto.randomUUID(),
      name: name ?? `Recording ${new Date().toLocaleTimeString()}`,
      startedAt: Date.now(),
      status: 'recording',
    };

    this.currentRecording = recording;
    this.notify();

    const result = await mcpClient.callTool('browser_follow_me_start', {
      language: 'javascript',
    });

    if (!result.success) {
      this.currentRecording = null;
      this.notify();
      throw new Error(`Failed to start recording: ${result.error}`);
    }

    return recording;
  }

  /** Stop recording and get the generated replay code. */
  async stopRecording(): Promise<Recording> {
    if (!this.currentRecording || this.currentRecording.status !== 'recording') {
      throw new Error('No active recording to stop');
    }

    this.currentRecording = { ...this.currentRecording, status: 'stopping' };
    this.notify();

    const result = await mcpClient.callTool('browser_follow_me_stop', {});

    // Extract the replay code from the MCP result content.
    let code: string | undefined;
    if (result.success) {
      if (typeof result.content === 'string') {
        code = result.content;
      } else if (typeof result.content === 'object' && result.content !== null) {
        // The tool may return structured content with a code/script field.
        const content = result.content as Record<string, unknown>;
        code = (content.code ?? content.script ?? content.text ?? JSON.stringify(content)) as string;
      }
    }

    const finishedRecording: Recording = {
      ...this.currentRecording,
      status: 'idle',
      stoppedAt: Date.now(),
      code,
    };

    this.savedRecordings.push(finishedRecording);
    this.currentRecording = null;
    this.notify();

    if (!result.success) {
      throw new Error(`Failed to stop recording: ${result.error}`);
    }

    return finishedRecording;
  }

  /** Replay the most recent (or a specific) recording. */
  async replay(recordingId?: string): Promise<void> {
    this.currentRecording = {
      id: recordingId ?? '',
      name: 'Replay',
      startedAt: Date.now(),
      status: 'replaying',
    };
    this.notify();

    try {
      const args: Record<string, unknown> = recordingId ? { id: recordingId } : {};
      const result = await mcpClient.callTool('browser_follow_me_replay', args);

      if (!result.success) {
        throw new Error(`Replay failed: ${result.error}`);
      }
    } finally {
      this.currentRecording = null;
      this.notify();
    }
  }

  /** Delete a saved recording by ID. */
  deleteRecording(id: string): void {
    this.savedRecordings = this.savedRecordings.filter((r) => r.id !== id);
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /** Notify all listeners of the current recording state. */
  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentRecording);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton and factory
// ---------------------------------------------------------------------------

export const followMeRecorder = new FollowMeRecorder();
export default followMeRecorder;

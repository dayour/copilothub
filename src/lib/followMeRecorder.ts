// ---------------------------------------------------------------------------
// followMeRecorder.ts -- Wrapper around the copilotbrowser MCP follow-me
// recording tools for CopilotHub. Manages recording lifecycle, replay, and
// persistence of generated automation code.
// ---------------------------------------------------------------------------

import mcpClient from './mcpClient';
import { captureStorage, type SavedRecording } from './captureStorage';

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
  private savedRecordings: SavedRecording[] = [];
  private hydrated = false;
  private listeners: Set<(recording: Recording | null) => void> = new Set();
  private savedListeners: Set<(items: SavedRecording[]) => void> = new Set();

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

  /** Subscribe to the saved-recordings list. Returns an unsubscribe function. */
  onSavedChange(listener: (items: SavedRecording[]) => void): () => void {
    this.savedListeners.add(listener);
    return () => {
      this.savedListeners.delete(listener);
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

  /** Get all saved recordings (persisted manifests under ~/Videos/CopilotHub). */
  getSavedRecordings(): SavedRecording[] {
    return [...this.savedRecordings];
  }

  /** Hydrate saved-recordings list from disk. Safe to call multiple times. */
  async hydrate(): Promise<SavedRecording[]> {
    try {
      this.savedRecordings = await captureStorage.listRecordings();
    } catch {
      this.savedRecordings = [];
    }
    this.hydrated = true;
    this.notifySaved();
    return this.getSavedRecordings();
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

    const finishedAt = Date.now();
    const finishedRecording: Recording = {
      ...this.currentRecording,
      status: 'idle',
      stoppedAt: finishedAt,
      code,
    };

    // Persist to ~/Videos/CopilotHub/ as `Recording YYYY-MM-DD HHmmss.{json,js}`.
    // Failures (e.g. running outside Tauri) are silent — in-memory state still
    // updates so the UI can surface the recording for this session.
    try {
      const saved = await captureStorage.saveRecording(
        {
          id: finishedRecording.id,
          name: finishedRecording.name,
          startedAt: finishedRecording.startedAt,
          stoppedAt: finishedAt,
          language: 'javascript',
        },
        code,
        new Date(finishedRecording.startedAt),
      );
      if (saved) {
        this.savedRecordings = [saved, ...this.savedRecordings];
        this.notifySaved();
      }
    } catch {
      // ignore persistence failures
    }

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

  /** Replay the most recently saved recording, sending its code to the MCP. */
  async replayLast(): Promise<void> {
    if (!this.hydrated) {
      await this.hydrate();
    }
    const latest = this.savedRecordings[0];
    if (!latest) {
      throw new Error('No saved recordings available');
    }
    await this.replay(latest.id);
  }

  /** Delete a saved recording by manifest filename. */
  async deleteSavedRecording(manifestFilename: string): Promise<void> {
    const target = this.savedRecordings.find((r) => r.manifestFilename === manifestFilename);
    if (!target) return;
    try {
      await captureStorage.deleteRecording(target);
    } catch {
      // ignore — fall through to remove from list anyway
    }
    this.savedRecordings = this.savedRecordings.filter(
      (r) => r.manifestFilename !== manifestFilename,
    );
    this.notifySaved();
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

  private notifySaved(): void {
    for (const listener of this.savedListeners) {
      listener(this.getSavedRecordings());
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton and factory
// ---------------------------------------------------------------------------

export const followMeRecorder = new FollowMeRecorder();
export default followMeRecorder;

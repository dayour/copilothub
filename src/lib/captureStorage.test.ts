import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  buildRecordingFilename,
  buildScreenshotFilename,
  captureTimestamp,
  captureStorage,
} from './captureStorage';

// captureStorage is gated on `isTauri`, which reads window.__TAURI_INTERNALS__.
// In Vitest (jsdom) this guard is false, so write/read methods short-circuit
// before they ever touch the (mocked) plugin-fs module. We verify both the
// pure helpers and the safe no-op behavior outside the Tauri shell.

describe('captureStorage filename helpers', () => {
  it('captureTimestamp emits Snipping-Tool style YYYY-MM-DD HHmmss', () => {
    const d = new Date(2026, 4, 18, 9, 43, 12); // months are 0-indexed
    expect(captureTimestamp(d)).toBe('2026-05-18 094312');
  });

  it('zero-pads each component', () => {
    const d = new Date(2026, 0, 1, 1, 2, 3);
    expect(captureTimestamp(d)).toBe('2026-01-01 010203');
  });

  it('buildScreenshotFilename appends correct extension', () => {
    const d = new Date(2026, 4, 18, 9, 43, 12);
    expect(buildScreenshotFilename(d)).toBe('Screenshot 2026-05-18 094312.png');
    expect(buildScreenshotFilename(d, 'jpg')).toBe('Screenshot 2026-05-18 094312.jpg');
  });

  it('buildRecordingFilename uses the same timestamp pattern', () => {
    const d = new Date(2026, 4, 18, 9, 43, 12);
    expect(buildRecordingFilename(d)).toBe('Recording 2026-05-18 094312.json');
    expect(buildRecordingFilename(d, 'js')).toBe('Recording 2026-05-18 094312.js');
  });
});

describe('captureStorage safety outside Tauri', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('saveScreenshot returns null when not running in Tauri', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const result = await captureStorage.saveScreenshot(bytes, 'image/png');
    expect(result).toBeNull();
  });

  it('saveRecording returns null when not running in Tauri', async () => {
    const result = await captureStorage.saveRecording(
      {
        id: 'r-1',
        name: 'Test recording',
        startedAt: Date.now() - 1000,
        stoppedAt: Date.now(),
      },
      "// replay code",
    );
    expect(result).toBeNull();
  });

  it('listRecordings returns empty array when not running in Tauri', async () => {
    const result = await captureStorage.listRecordings();
    expect(result).toEqual([]);
  });

  it('listScreenshots returns empty array when not running in Tauri', async () => {
    const result = await captureStorage.listScreenshots();
    expect(result).toEqual([]);
  });

  it('open/reveal helpers are silent no-ops outside Tauri', async () => {
    await expect(captureStorage.openScreenshotsFolder()).resolves.toBeUndefined();
    await expect(captureStorage.openRecordingsFolder()).resolves.toBeUndefined();
  });
});

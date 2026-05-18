// ---------------------------------------------------------------------------
// captureStorage.ts -- Persistent storage for screenshots and follow-me
// recordings. Uses Windows-native defaults so output lands next to files
// produced by Snipping Tool and Clipchamp:
//
//   Screenshots: %USERPROFILE%\Pictures\Screenshots\CopilotHub\
//   Recordings : %USERPROFILE%\Videos\CopilotHub\
//
// Filename convention matches the Snipping Tool pattern:
//   Screenshot 2026-05-18 094312.png
//   Recording  2026-05-18 094312.json   (manifest with metadata)
//   Recording  2026-05-18 094312.js     (replay code, when present)
// ---------------------------------------------------------------------------

import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';

import { isTauri } from './tauri';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedScreenshot {
  filename: string;
  path: string;
  createdAt: number;
  mimeType: string;
}

export interface RecordingManifest {
  id: string;
  name: string;
  startedAt: number;
  stoppedAt: number;
  /** Replay code language as reported by browser_follow_me_start. */
  language?: string;
  /** Companion .js filename (relative, same directory). */
  codeFilename?: string;
}

export interface SavedRecording extends RecordingManifest {
  manifestFilename: string;
  manifestPath: string;
}

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Build a Snipping-Tool-style timestamp segment: "YYYY-MM-DD HHmmss".
 * (Note: no separator inside the time, matching Win11 Snipping Tool output.)
 */
export function captureTimestamp(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}${mi}${ss}`;
}

export function buildScreenshotFilename(date: Date = new Date(), ext = 'png'): string {
  return `Screenshot ${captureTimestamp(date)}.${ext}`;
}

export function buildRecordingFilename(date: Date = new Date(), ext = 'json'): string {
  return `Recording ${captureTimestamp(date)}.${ext}`;
}

function extFromMimeType(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  return 'png';
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

class CaptureStorage {
  private screenshotsDir: string | null = null;
  private recordingsDir: string | null = null;

  // -------------------------------------------------------------------------
  // Directory resolution (lazy, cached). Creates directories on first use.
  // -------------------------------------------------------------------------

  async getScreenshotsDir(): Promise<string> {
    if (!isTauri) {
      throw new Error('Capture storage is only available inside the CopilotHub Tauri shell.');
    }
    if (this.screenshotsDir) return this.screenshotsDir;

    const home = await homeDir();
    const dir = await join(home, 'Pictures', 'Screenshots', 'CopilotHub');
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
    this.screenshotsDir = dir;
    return dir;
  }

  async getRecordingsDir(): Promise<string> {
    if (!isTauri) {
      throw new Error('Capture storage is only available inside the CopilotHub Tauri shell.');
    }
    if (this.recordingsDir) return this.recordingsDir;

    const home = await homeDir();
    const dir = await join(home, 'Videos', 'CopilotHub');
    if (!(await exists(dir))) {
      await mkdir(dir, { recursive: true });
    }
    this.recordingsDir = dir;
    return dir;
  }

  // -------------------------------------------------------------------------
  // Screenshots
  // -------------------------------------------------------------------------

  /**
   * Save a screenshot to ~/Pictures/Screenshots/CopilotHub/.
   * Returns the saved metadata, or null when not running in Tauri.
   */
  async saveScreenshot(
    bytes: Uint8Array,
    mimeType: string = 'image/png',
    date: Date = new Date(),
  ): Promise<SavedScreenshot | null> {
    if (!isTauri) return null;

    const dir = await this.getScreenshotsDir();
    const filename = buildScreenshotFilename(date, extFromMimeType(mimeType));
    const fullPath = await join(dir, filename);
    await writeFile(fullPath, bytes);

    return {
      filename,
      path: fullPath,
      createdAt: date.getTime(),
      mimeType,
    };
  }

  async listScreenshots(): Promise<SavedScreenshot[]> {
    if (!isTauri) return [];

    const dir = await this.getScreenshotsDir();
    const entries = await readDir(dir);
    const files = entries.filter(
      (e) => e.isFile && typeof e.name === 'string' && /\.(png|jpg|jpeg|webp|gif)$/i.test(e.name),
    );

    const result: SavedScreenshot[] = [];
    for (const entry of files) {
      const path = await join(dir, entry.name);
      result.push({
        filename: entry.name,
        path,
        createdAt: 0,
        mimeType: `image/${(entry.name.split('.').pop() ?? 'png').toLowerCase()}`,
      });
    }
    return result.sort((a, b) => b.filename.localeCompare(a.filename));
  }

  // -------------------------------------------------------------------------
  // Recordings
  // -------------------------------------------------------------------------

  /**
   * Save a recording. Writes a `.json` manifest and, when replay code is
   * present, a companion `.js` file in the same directory.
   */
  async saveRecording(
    manifest: Omit<RecordingManifest, 'codeFilename'>,
    code?: string,
    date: Date = new Date(),
  ): Promise<SavedRecording | null> {
    if (!isTauri) return null;

    const dir = await this.getRecordingsDir();
    const base = `Recording ${captureTimestamp(date)}`;
    const manifestFilename = `${base}.json`;
    const codeFilename = code ? `${base}.js` : undefined;

    const finalManifest: RecordingManifest = { ...manifest, codeFilename };
    const manifestPath = await join(dir, manifestFilename);
    await writeTextFile(manifestPath, JSON.stringify(finalManifest, null, 2));

    if (code && codeFilename) {
      const codePath = await join(dir, codeFilename);
      await writeTextFile(codePath, code);
    }

    return {
      ...finalManifest,
      manifestFilename,
      manifestPath,
    };
  }

  async listRecordings(): Promise<SavedRecording[]> {
    if (!isTauri) return [];

    const dir = await this.getRecordingsDir();
    const entries = await readDir(dir);
    const manifests = entries.filter(
      (e) => e.isFile && typeof e.name === 'string' && e.name.endsWith('.json'),
    );

    const result: SavedRecording[] = [];
    for (const entry of manifests) {
      const manifestPath = await join(dir, entry.name);
      try {
        const text = await readTextFile(manifestPath);
        const parsed = JSON.parse(text) as RecordingManifest;
        result.push({
          ...parsed,
          manifestFilename: entry.name,
          manifestPath,
        });
      } catch {
        // Skip malformed manifests rather than blocking the whole list.
      }
    }
    return result.sort((a, b) => b.startedAt - a.startedAt);
  }

  async readRecordingCode(recording: SavedRecording): Promise<string | null> {
    if (!isTauri || !recording.codeFilename) return null;
    const dir = await this.getRecordingsDir();
    const codePath = await join(dir, recording.codeFilename);
    if (!(await exists(codePath))) return null;
    return readTextFile(codePath);
  }

  async deleteRecording(recording: SavedRecording): Promise<void> {
    if (!isTauri) return;
    const dir = await this.getRecordingsDir();

    await remove(recording.manifestPath);

    if (recording.codeFilename) {
      const codePath = await join(dir, recording.codeFilename);
      if (await exists(codePath)) {
        await remove(codePath);
      }
    }
  }

  async deleteScreenshot(shot: SavedScreenshot): Promise<void> {
    if (!isTauri) return;
    await remove(shot.path);
  }

  // -------------------------------------------------------------------------
  // Reveal-in-Explorer helpers
  // -------------------------------------------------------------------------

  async openScreenshotsFolder(): Promise<void> {
    if (!isTauri) return;
    const dir = await this.getScreenshotsDir();
    await openPath(dir);
  }

  async openRecordingsFolder(): Promise<void> {
    if (!isTauri) return;
    const dir = await this.getRecordingsDir();
    await openPath(dir);
  }

  async revealScreenshot(shot: SavedScreenshot): Promise<void> {
    if (!isTauri) return;
    await revealItemInDir(shot.path);
  }

  async revealRecording(recording: SavedRecording): Promise<void> {
    if (!isTauri) return;
    await revealItemInDir(recording.manifestPath);
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const captureStorage = new CaptureStorage();
export default captureStorage;

import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import YAML from 'yaml';

import type { RunbookManifest, RunbookVisibility } from '../types/runbook';

export interface RunbookSummary
  extends Pick<RunbookManifest, 'name' | 'version' | 'author' | 'description' | 'tags' | 'visibility'> {
  filename: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function normalizeVisibility(value: unknown): RunbookVisibility {
  if (value === 'personal' || value === 'enterprise' || value === 'public') {
    return value;
  }
  return 'personal';
}

function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    throw new Error('Filename is required.');
  }

  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    throw new Error('Filename must not contain path separators.');
  }

  if (!trimmed.toLowerCase().endsWith('.yaml')) {
    throw new Error('Filename must end with .yaml');
  }

  return trimmed;
}

function summaryFromContent(filename: string, content: string): RunbookSummary {
  try {
    const parsed = YAML.parse(content);
    const manifest = isRecord(parsed) && isRecord(parsed.manifest) ? parsed.manifest : {};

    const name = typeof manifest.name === 'string' && manifest.name.trim().length > 0 ? manifest.name.trim() : filename;
    const version =
      typeof manifest.version === 'string' && manifest.version.trim().length > 0 ? manifest.version.trim() : '0.0.1';
    const author =
      typeof manifest.author === 'string' && manifest.author.trim().length > 0 ? manifest.author.trim() : 'Unknown';
    const description =
      typeof manifest.description === 'string' && manifest.description.trim().length > 0
        ? manifest.description.trim()
        : 'No description provided.';

    return {
      filename,
      name,
      version,
      author,
      description,
      tags: toStringArray(manifest.tags),
      visibility: normalizeVisibility(manifest.visibility),
    };
  } catch {
    return {
      filename,
      name: filename,
      version: '0.0.1',
      author: 'Unknown',
      description: 'Unable to parse runbook manifest.',
      tags: [],
      visibility: 'personal',
    };
  }
}

class RunbookStorage {
  private runbooksDir: string | null = null;

  public async getRunbooksDir(): Promise<string> {
    if (this.runbooksDir) {
      return this.runbooksDir;
    }

    const home = await homeDir();
    const runbooksDir = await join(home, 'CopilotOS', 'Runbooks');

    if (!(await exists(runbooksDir))) {
      await mkdir(runbooksDir, { recursive: true });
    }

    this.runbooksDir = runbooksDir;
    return runbooksDir;
  }

  public async listRunbooks(): Promise<RunbookSummary[]> {
    const runbooksDir = await this.getRunbooksDir();
    const entries = await readDir(runbooksDir);

    const summaries = await Promise.all(
      entries
        .filter((entry) => entry.isFile)
        .filter((e) => e.name && typeof e.name === 'string' && e.name.endsWith('.yaml'))
        .map(async (entry) => {
          const filePath = await join(runbooksDir, entry.name);
          const content = await readTextFile(filePath);
          return summaryFromContent(entry.name, content);
        }),
    );

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }

  public async readRunbook(filename: string): Promise<string> {
    const safeFilename = sanitizeFilename(filename);
    const runbooksDir = await this.getRunbooksDir();
    const filePath = await join(runbooksDir, safeFilename);
    return readTextFile(filePath);
  }

  public async writeRunbook(filename: string, content: string): Promise<void> {
    const safeFilename = sanitizeFilename(filename);
    const runbooksDir = await this.getRunbooksDir();
    const filePath = await join(runbooksDir, safeFilename);
    await writeTextFile(filePath, content);
  }

  public async deleteRunbook(filename: string): Promise<void> {
    const safeFilename = sanitizeFilename(filename);
    const runbooksDir = await this.getRunbooksDir();
    const filePath = await join(runbooksDir, safeFilename);
    await remove(filePath);
  }
}

export const runbookStorage = new RunbookStorage();

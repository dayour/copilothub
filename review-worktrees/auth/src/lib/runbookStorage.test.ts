import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';

import { runbookStorage } from './runbookStorage';

describe('runbookStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homeDir).mockResolvedValue('/mock/home');
    vi.mocked(join).mockImplementation(async (...parts: string[]) => parts.join('/'));
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readDir).mockResolvedValue([]);
    vi.mocked(readTextFile).mockResolvedValue('');
    vi.mocked(writeTextFile).mockResolvedValue(undefined);
    vi.mocked(remove).mockResolvedValue(undefined);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    (runbookStorage as unknown as { runbooksDir: string | null }).runbooksDir = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getRunbooksDir returns correct path', async () => {
    const dir = await runbookStorage.getRunbooksDir();

    expect(homeDir).toHaveBeenCalledTimes(1);
    expect(join).toHaveBeenCalledWith('/mock/home', 'CopilotOS', 'Runbooks');
    expect(dir).toBe('/mock/home/CopilotOS/Runbooks');
  });

  it('getRunbooksDir creates directory if not exists', async () => {
    vi.mocked(exists).mockResolvedValue(false);

    await runbookStorage.getRunbooksDir();

    expect(mkdir).toHaveBeenCalledWith('/mock/home/CopilotOS/Runbooks', { recursive: true });
  });

  it('listRunbooks with empty dir', async () => {
    vi.mocked(readDir).mockResolvedValue([]);

    const result = await runbookStorage.listRunbooks();

    expect(result).toEqual([]);
  });

  it('listRunbooks filters yaml files', async () => {
    vi.mocked(readDir).mockResolvedValue([
      { isFile: true, name: 'beta.yaml' },
      { isFile: true, name: 'notes.txt' },
      { isFile: true, name: 'alpha.yaml' },
      { isFile: false, name: 'folder' },
    ] as Awaited<ReturnType<typeof readDir>>);
    vi.mocked(readTextFile)
      .mockResolvedValueOnce('manifest:\n  name: Beta')
      .mockResolvedValueOnce('manifest:\n  name: Alpha');

    const result = await runbookStorage.listRunbooks();

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.filename)).toEqual(['alpha.yaml', 'beta.yaml']);
    expect(readTextFile).toHaveBeenCalledTimes(2);
  });

  it('listRunbooks handles undefined entry names', async () => {
    vi.mocked(readDir).mockResolvedValue([{ isFile: true, name: undefined }] as Awaited<ReturnType<typeof readDir>>);

    const result = await runbookStorage.listRunbooks();

    expect(result).toEqual([]);
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it('readRunbook reads file content', async () => {
    vi.mocked(readTextFile).mockResolvedValue('runbook: content');

    const content = await runbookStorage.readRunbook('sample.yaml');

    expect(join).toHaveBeenCalledWith('/mock/home/CopilotOS/Runbooks', 'sample.yaml');
    expect(readTextFile).toHaveBeenCalledWith('/mock/home/CopilotOS/Runbooks/sample.yaml');
    expect(content).toBe('runbook: content');
  });

  it('writeRunbook writes file', async () => {
    await runbookStorage.writeRunbook('save.yaml', 'manifest:\n  name: Save');

    expect(writeTextFile).toHaveBeenCalledWith('/mock/home/CopilotOS/Runbooks/save.yaml', 'manifest:\n  name: Save');
  });

  it('deleteRunbook removes file', async () => {
    await runbookStorage.deleteRunbook('remove.yaml');

    expect(remove).toHaveBeenCalledWith('/mock/home/CopilotOS/Runbooks/remove.yaml');
  });

  it('readRunbook on nonexistent file throws', async () => {
    vi.mocked(readTextFile).mockRejectedValue(new Error('File not found'));

    await expect(runbookStorage.readRunbook('missing.yaml')).rejects.toThrow('File not found');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const executeMock = vi.fn();

vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: {
    create: vi.fn(() => ({ execute: executeMock })),
  },
}));

vi.mock('./tauri', () => ({ isTauri: true }));

import { pacClient } from './pacClient';

describe('pacClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('version() returns pac version output on success', async () => {
    executeMock.mockResolvedValue({ stdout: 'pac 1.35.6 (3.25.6)', stderr: '', code: 0 });

    const result = await pacClient.version();

    expect(result.success).toBe(true);
    expect(result.stdout).toBe('pac 1.35.6 (3.25.6)');
    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('authList() surfaces pac stderr as an error message on non-zero exit', async () => {
    executeMock.mockResolvedValue({
      stdout: '',
      stderr: 'No authentication profiles found.',
      code: 1,
    });

    const result = await pacClient.authList();

    expect(result.success).toBe(false);
    expect(result.stderr).toBe('No authentication profiles found.');
    expect(result.error).toBe('No authentication profiles found.');
    expect(result.exitCode).toBe(1);
  });

  it('solutionList() returns solution names on success', async () => {
    const solutionOutput = 'Solution1\nSolution2\nSolution3';
    executeMock.mockResolvedValue({ stdout: solutionOutput, stderr: '', code: 0 });

    const result = await pacClient.solutionList();

    expect(result.success).toBe(true);
    expect(result.stdout).toBe(solutionOutput);
  });

  it('run() tokenizes a quoted command string correctly', async () => {
    const { Command } = await import('@tauri-apps/plugin-shell');
    executeMock.mockResolvedValue({ stdout: '', stderr: '', code: 0 });

    await pacClient.run('org list --environment "my env"');

    expect(Command.create).toHaveBeenCalledWith('pac', ['org', 'list', '--environment', 'my env']);
  });

  it('dataverseQuery() prepends the data subcommand', async () => {
    const { Command } = await import('@tauri-apps/plugin-shell');
    executeMock.mockResolvedValue({ stdout: '[]', stderr: '', code: 0 });

    await pacClient.dataverseQuery('list-entities --environment dev');

    expect(Command.create).toHaveBeenCalledWith('pac', [
      'data',
      'list-entities',
      '--environment',
      'dev',
    ]);
  });

  it('propagates a timeout as a failure result', async () => {
    vi.useFakeTimers();
    executeMock.mockImplementation(
      () => new Promise((_resolve) => { /* never resolves */ }),
    );

    const resultPromise = pacClient.version();
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out/i);

    vi.useRealTimers();
  });
});


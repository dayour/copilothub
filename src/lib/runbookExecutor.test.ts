import { afterEach, describe, expect, it, vi } from 'vitest';

import { RunbookExecutor } from './runbookExecutor';
import type { ParsedRunbook } from './runbookParser';

function createRunbook(steps: ParsedRunbook['steps']): ParsedRunbook {
  return {
    manifest: {
      name: 'test-runbook',
      version: '1.0.0',
      author: 'Test',
      description: 'test',
      tags: ['unit'],
      visibility: 'personal',
    },
    variables: [],
    steps,
    chain: null,
  };
}

describe('RunbookExecutor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes a simple runbook with one step', async () => {
    const runbook = createRunbook([
      {
        id: 'step-1',
        tool: 'shell.exec',
        args: { command: 'echo hello' },
      },
    ]);
    const mcpCallTool = vi.fn().mockResolvedValue({ success: true, content: 'ok' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(mcpCallTool).toHaveBeenCalledTimes(1);
    expect(mcpCallTool).toHaveBeenCalledWith('shell.exec', { command: 'echo hello' });
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0].stepId).toBe('step-1');
    expect(result.stepResults[0].status).toBe('completed');
    expect(result.stepResults[0].output).toBe('ok');
  });

  it('executes multi-step runbook in order', async () => {
    const runbook = createRunbook([
      { id: 's1', tool: 'shell.exec', args: { command: 'first' } },
      { id: 's2', tool: 'shell.exec', args: { command: 'second' } },
      { id: 's3', tool: 'browser.screenshot', args: { fullPage: true } },
    ]);
    const callOrder: string[] = [];
    const mcpCallTool = vi.fn(async (name: string) => {
      callOrder.push(name);
      return { success: true, content: { ok: true } };
    });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(callOrder).toEqual(['shell.exec', 'shell.exec', 'browser.screenshot']);
    expect(result.stepResults.map((step) => step.stepId)).toEqual(['s1', 's2', 's3']);
  });

  it('stops execution when step fails with onError abort', async () => {
    const runbook = createRunbook([
      {
        id: 'fail-now',
        tool: 'shell.exec',
        args: { command: 'bad' },
        onError: { action: 'abort' },
      },
      {
        id: 'never-run',
        tool: 'shell.exec',
        args: { command: 'next' },
      },
    ]);
    const mcpCallTool = vi
      .fn()
      .mockResolvedValueOnce({ success: false, content: null, error: 'step failed' })
      .mockResolvedValueOnce({ success: true, content: 'ok' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('failed');
    expect(mcpCallTool).toHaveBeenCalledTimes(1);
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0]).toMatchObject({
      stepId: 'fail-now',
      status: 'failed',
    });
  });

  it('continues execution when step fails with onError skip', async () => {
    const runbook = createRunbook([
      {
        id: 'skip-me',
        tool: 'shell.exec',
        args: { command: 'might fail' },
        onError: { action: 'skip' },
      },
      {
        id: 'run-me',
        tool: 'shell.exec',
        args: { command: 'continue' },
      },
    ]);
    const mcpCallTool = vi
      .fn()
      .mockResolvedValueOnce({ success: false, content: null, error: 'temporary fail' })
      .mockResolvedValueOnce({ success: true, content: 'continued' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(mcpCallTool).toHaveBeenCalledTimes(2);
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults[0]).toMatchObject({ stepId: 'skip-me', status: 'skipped' });
    expect(result.stepResults[1]).toMatchObject({ stepId: 'run-me', status: 'completed' });
  });

  it('retries failed step up to retry count when onError retry(2)', async () => {
    const runbook = createRunbook([
      {
        id: 'retry-step',
        tool: 'shell.exec',
        args: { command: 'flaky' },
        onError: { action: 'retry', count: 2 },
      },
    ]);
    const mcpCallTool = vi
      .fn()
      .mockResolvedValueOnce({ success: false, content: null, error: 'attempt 1 failed' })
      .mockResolvedValueOnce({ success: false, content: null, error: 'attempt 2 failed' })
      .mockResolvedValueOnce({ success: true, content: 'eventual success' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(mcpCallTool).toHaveBeenCalledTimes(3);
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0]).toMatchObject({
      stepId: 'retry-step',
      status: 'completed',
      output: 'eventual success',
    });
  });

  it('emits expected event callbacks', async () => {
    const runbook = createRunbook([{ id: 's1', tool: 'shell.exec', args: { command: 'echo' } }]);
    const mcpCallTool = vi.fn().mockResolvedValue({ success: true, content: 'ok' });
    const onEvent = vi.fn();
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook, { onEvent });

    expect(result.status).toBe('completed');
    const types = onEvent.mock.calls.map(([event]) => event.type);
    expect(types).toContain('runbook-start');
    expect(types).toContain('step-start');
    expect(types).toContain('step-complete');
    expect(types).toContain('runbook-complete');
  });

  it('stops execution when aborted via AbortSignal', async () => {
    const controller = new AbortController();
    const runbook = createRunbook([
      { id: 's1', tool: 'shell.exec', args: { command: 'first' } },
      { id: 's2', tool: 'shell.exec', args: { command: 'second' } },
    ]);
    const mcpCallTool = vi.fn(async () => {
      controller.abort();
      return { success: true, content: 'ok' };
    });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook, { abortSignal: controller.signal });

    expect(result.status).toBe('failed');
    expect(mcpCallTool).toHaveBeenCalledTimes(1);
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0]).toMatchObject({ stepId: 's1', status: 'completed' });
  });

  it('handles mcpCallTool that throws an exception', async () => {
    const runbook = createRunbook([
      {
        id: 'step-1',
        tool: 'shell.exec',
        args: { command: 'echo hello' },
      },
    ]);
    const mcpCallTool = vi.fn().mockRejectedValue(new Error('network crash'));
    const executor = new RunbookExecutor(mcpCallTool);
    const result = await executor.execute(runbook);
    expect(result.status).toBe('failed');
    expect(result.stepResults[0].status).toBe('failed');
  });

  // --- DAG execution tests ---

  it('executes DAG steps in parallel when dependsOn specified', async () => {
    const runbook = createRunbook([
      { id: 'root', tool: 'shell.exec', args: { command: 'init' } },
      { id: 'branch-a', tool: 'shell.exec', args: { command: 'a' }, dependsOn: ['root'] },
      { id: 'branch-b', tool: 'shell.exec', args: { command: 'b' }, dependsOn: ['root'] },
      { id: 'join', tool: 'shell.exec', args: { command: 'join' }, dependsOn: ['branch-a', 'branch-b'] },
    ]);

    const callOrder: string[] = [];
    const mcpCallTool = vi.fn(async (_name: string, args: Record<string, unknown>) => {
      callOrder.push(args.command as string);
      return { success: true, content: `result-${args.command}` };
    });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(result.stepResults).toHaveLength(4);
    // Root must run first
    expect(callOrder[0]).toBe('init');
    // branch-a and branch-b should both run before join
    expect(callOrder.indexOf('join')).toBeGreaterThan(callOrder.indexOf('a'));
    expect(callOrder.indexOf('join')).toBeGreaterThan(callOrder.indexOf('b'));
  });

  it('captures step output via captureAs in sequential mode', async () => {
    const runbook = createRunbook([
      {
        id: 'fetch',
        tool: 'shell.exec',
        args: { command: 'fetch-data' },
        captureAs: 'fetchResult',
      },
      {
        id: 'use',
        tool: 'shell.exec',
        args: { command: 'process ${fetchResult}' },
      },
    ]);

    const mcpCallTool = vi.fn()
      .mockResolvedValueOnce({ success: true, content: 'captured-value' })
      .mockResolvedValueOnce({ success: true, content: 'ok' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    // The second step should have received the captured variable
    expect(mcpCallTool).toHaveBeenCalledWith('shell.exec', { command: 'process captured-value' });
  });

  it('captures step output via captureAs in DAG mode', async () => {
    const runbook = createRunbook([
      {
        id: 'fetch',
        tool: 'shell.exec',
        args: { command: 'fetch-data' },
        captureAs: 'fetchResult',
      },
      {
        id: 'use',
        tool: 'shell.exec',
        args: { command: 'process ${fetchResult}' },
        dependsOn: ['fetch'],
      },
    ]);

    const mcpCallTool = vi.fn()
      .mockResolvedValueOnce({ success: true, content: 'dag-captured' })
      .mockResolvedValueOnce({ success: true, content: 'ok' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(mcpCallTool).toHaveBeenCalledWith('shell.exec', { command: 'process dag-captured' });
  });

  it('skips step when condition is not met', async () => {
    const runbook = createRunbook([
      { id: 's1', tool: 'shell.exec', args: { command: 'first' } },
      {
        id: 'only-on-failure',
        tool: 'shell.exec',
        args: { command: 'recovery' },
        condition: { ref: 's1', status: 'failed' },
      },
    ]);

    const mcpCallTool = vi.fn().mockResolvedValue({ success: true, content: 'ok' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults[0].status).toBe('completed');
    expect(result.stepResults[1].status).toBe('skipped');
    // The conditional step should never have been called
    expect(mcpCallTool).toHaveBeenCalledTimes(1);
  });

  it('runs step when condition is met', async () => {
    const runbook = createRunbook([
      { id: 's1', tool: 'shell.exec', args: { command: 'first' } },
      {
        id: 'after-success',
        tool: 'shell.exec',
        args: { command: 'post' },
        condition: { ref: 's1', status: 'completed' },
      },
    ]);

    const mcpCallTool = vi.fn().mockResolvedValue({ success: true, content: 'ok' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults[0].status).toBe('completed');
    expect(result.stepResults[1].status).toBe('completed');
    expect(mcpCallTool).toHaveBeenCalledTimes(2);
  });

  it('DAG execution fails and stops when a required step fails', async () => {
    const runbook = createRunbook([
      { id: 'root', tool: 'shell.exec', args: { command: 'init' } },
      { id: 'bad', tool: 'shell.exec', args: { command: 'fail' }, dependsOn: ['root'] },
      { id: 'after', tool: 'shell.exec', args: { command: 'never' }, dependsOn: ['bad'] },
    ]);

    const mcpCallTool = vi.fn()
      .mockResolvedValueOnce({ success: true, content: 'ok' })
      .mockResolvedValueOnce({ success: false, content: null, error: 'boom' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('failed');
    // 'after' should never execute since 'bad' failed
    expect(mcpCallTool).toHaveBeenCalledTimes(2);
  });

  it('captures object output as JSON string', async () => {
    const runbook = createRunbook([
      {
        id: 'fetch',
        tool: 'shell.exec',
        args: { command: 'get' },
        captureAs: 'data',
      },
      {
        id: 'use',
        tool: 'shell.exec',
        args: { command: 'process ${data}' },
      },
    ]);

    const mcpCallTool = vi.fn()
      .mockResolvedValueOnce({ success: true, content: { key: 'value' } })
      .mockResolvedValueOnce({ success: true, content: 'ok' });
    const executor = new RunbookExecutor(mcpCallTool);

    const result = await executor.execute(runbook);

    expect(result.status).toBe('completed');
    expect(mcpCallTool).toHaveBeenCalledWith('shell.exec', { command: 'process {"key":"value"}' });
  });
});

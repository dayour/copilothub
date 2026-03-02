import { afterEach, describe, expect, it, vi } from 'vitest';

import { executeAction, formatActionResult, parseActionCommand } from './actionMode';

describe('actionMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('@browser navigate parses to browser_navigate with url', () => {
    const command = parseActionCommand('@browser navigate to https://example.com');
    expect(command).toEqual({
      tool: 'browser_navigate',
      args: { url: 'https://example.com' },
      raw: '@browser navigate to https://example.com',
    });
  });

  it('@browser click parses to browser_click with selector args', () => {
    const command = parseActionCommand('@browser click .submit');
    expect(command).toEqual({
      tool: 'browser_click',
      args: { element: '.submit', ref: '.submit' },
      raw: '@browser click .submit',
    });
  });

  it('@browser fill parses to browser_fill with selector and text', () => {
    const command = parseActionCommand('@browser fill #email user@test.com');
    expect(command).toEqual({
      tool: 'browser_fill',
      args: { element: '#email', ref: '#email', text: 'user@test.com' },
      raw: '@browser fill #email user@test.com',
    });
  });

  it('@browser screenshot parses to browser_screenshot', () => {
    const command = parseActionCommand('@browser screenshot');
    expect(command).toEqual({
      tool: 'browser_screenshot',
      args: {},
      raw: '@browser screenshot',
    });
  });

  it('@browser snapshot parses to browser_snapshot', () => {
    const command = parseActionCommand('@browser snapshot');
    expect(command).toEqual({
      tool: 'browser_snapshot',
      args: {},
      raw: '@browser snapshot',
    });
  });

  it('@terminal run parses to shell_exec with command', () => {
    const command = parseActionCommand('@terminal run ls -la');
    expect(command).toEqual({
      tool: 'shell_exec',
      args: { command: 'ls -la' },
      raw: '@terminal run ls -la',
    });
  });

  it('@vscode open parses to vscode_open with path', () => {
    const command = parseActionCommand('@vscode open /path/file');
    expect(command).toEqual({
      tool: 'vscode_open',
      args: { path: '/path/file' },
      raw: '@vscode open /path/file',
    });
  });

  it('@runbook run parses to runbook_execute with name', () => {
    const command = parseActionCommand('@runbook run my-runbook');
    expect(command).toEqual({
      tool: 'runbook_execute',
      args: { name: 'my-runbook' },
      raw: '@runbook run my-runbook',
    });
  });

  it('returns null for unrecognized command', () => {
    expect(parseActionCommand('@browser dance now')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseActionCommand('   ')).toBeNull();
  });

  it('executeAction success calls callTool with correct args', async () => {
    const command = parseActionCommand('@terminal run echo hello');
    expect(command).not.toBeNull();

    const callTool = vi.fn().mockResolvedValue({
      success: true,
      content: { message: 'ok' },
    });

    const result = await executeAction(command!, { callTool });

    expect(callTool).toHaveBeenCalledWith('shell_exec', { command: 'echo hello' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('"message": "ok"');
    expect(result.error).toBeUndefined();
  });

  it('executeAction handles thrown errors', async () => {
    const command = parseActionCommand('@browser snapshot');
    expect(command).not.toBeNull();

    const callTool = vi.fn().mockRejectedValue(new Error('boom'));

    const result = await executeAction(command!, { callTool });

    expect(result.success).toBe(false);
    expect(result.output).toBe('');
    expect(result.error).toBe('boom');
  });

  it('formatActionResult formats success result', () => {
    const formatted = formatActionResult({ success: true, output: 'done' });
    expect(formatted).toBe('Action completed successfully.\ndone');
  });

  it('formatActionResult formats error result', () => {
    const formatted = formatActionResult({ success: false, output: '', error: 'tool failed' });
    expect(formatted).toBe('Action failed: tool failed');
  });

  it('handles extra whitespace in command', () => {
    const cmd = parseActionCommand('@browser   navigate   to   https://example.com');
    expect(cmd).not.toBeNull();
    expect(cmd!.tool).toBe('browser_navigate');
  });

  it('handles URLs with query parameters', () => {
    const cmd = parseActionCommand('@browser navigate to https://test.com?param=value&other=123');
    expect(cmd).not.toBeNull();
    expect(cmd!.args.url).toContain('param=value');
  });

  it('handles terminal command with pipes', () => {
    const cmd = parseActionCommand('@terminal run ls -la | grep .txt');
    expect(cmd).not.toBeNull();
    expect(cmd!.tool).toBe('shell_exec');
  });

  it('returns null for @browser click without selector', () => {
    const cmd = parseActionCommand('@browser click');
    expect(cmd).toBeNull();
  });

  it('formatActionResult handles empty output', () => {
    const result = formatActionResult({ success: true, output: '' });
    expect(typeof result).toBe('string');
    expect(result).toBe('Action completed successfully.');
  });
});

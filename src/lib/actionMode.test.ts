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

  it('@browser supports colon separators', () => {
    const command = parseActionCommand('@browser: navigate to https://example.com');
    expect(command).toEqual({
      tool: 'browser_navigate',
      args: { url: 'https://example.com' },
      raw: '@browser: navigate to https://example.com',
    });
  });

  it('@terminal allows bare commands without run keyword', () => {
    const command = parseActionCommand('@terminal ls -la');
    expect(command).toEqual({
      tool: 'shell_exec',
      args: { command: 'ls -la' },
      raw: '@terminal ls -la',
    });
  });

  it('@vscode allows bare path without open keyword', () => {
    const command = parseActionCommand('@vscode /path/file');
    expect(command).toEqual({
      tool: 'vscode_open',
      args: { path: '/path/file' },
      raw: '@vscode /path/file',
    });
  });

  it('@runbook allows bare name without run keyword', () => {
    const command = parseActionCommand('@runbook my-runbook');
    expect(command).toEqual({
      tool: 'runbook_execute',
      args: { name: 'my-runbook' },
      raw: '@runbook my-runbook',
    });
  });

  it('@browser click supports quoted selectors', () => {
    const command = parseActionCommand('@browser click "Save changes"');
    expect(command).toEqual({
      tool: 'browser_click',
      args: { element: 'Save changes', ref: 'Save changes' },
      raw: '@browser click "Save changes"',
    });
  });

  it('@browser fill supports quoted selector and text', () => {
    const command = parseActionCommand('@browser fill "Email field" "user@test.com"');
    expect(command).toEqual({
      tool: 'browser_fill',
      args: { element: 'Email field', ref: 'Email field', text: 'user@test.com' },
      raw: '@browser fill "Email field" "user@test.com"',
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

  it('returns null for @browser navigate with non-http scheme', () => {
    const cmd = parseActionCommand('@browser navigate to javascript:alert(1)');
    expect(cmd).toBeNull();
  });

  it('formatActionResult handles empty output', () => {
    const result = formatActionResult({ success: true, output: '' });
    expect(typeof result).toBe('string');
    expect(result).toBe('Action completed successfully.');
  });

  it('@graph dispatches to graph_query with query argument', () => {
    const command = parseActionCommand('@graph: list my recent emails');
    expect(command).toEqual({
      tool: 'graph_query',
      args: { query: 'list my recent emails' },
      raw: '@graph: list my recent emails',
    });
  });

  it('@graph with space separator dispatches to graph_query', () => {
    const command = parseActionCommand('@graph get my calendar events');
    expect(command).toEqual({
      tool: 'graph_query',
      args: { query: 'get my calendar events' },
      raw: '@graph get my calendar events',
    });
  });

  it('@power dispatches to pac_run with command argument', () => {
    const command = parseActionCommand('@power org list');
    expect(command).toEqual({
      tool: 'pac_run',
      args: { command: 'org list' },
      raw: '@power org list',
    });
  });

  it('@dataverse dispatches to dataverse_query with query argument', () => {
    const command = parseActionCommand('@dataverse list-entities --environment dev');
    expect(command).toEqual({
      tool: 'dataverse_query',
      args: { query: 'list-entities --environment dev' },
      raw: '@dataverse list-entities --environment dev',
    });
  });

  it('@workiq dispatches to workiq_ask with question argument', () => {
    const command = parseActionCommand('@workiq: what is the status of my open tasks?');
    expect(command).toEqual({
      tool: 'workiq_ask',
      args: { question: 'what is the status of my open tasks?' },
      raw: '@workiq: what is the status of my open tasks?',
    });
  });

  it('@agent365 is an alias for @workiq and dispatches to workiq_ask', () => {
    const command = parseActionCommand('@agent365 summarize my emails');
    expect(command).toEqual({
      tool: 'workiq_ask',
      args: { question: 'summarize my emails' },
      raw: '@agent365 summarize my emails',
    });
  });

  it('returns null for @graph with empty command', () => {
    const command = parseActionCommand('@graph:   ');
    expect(command).toBeNull();
  });

  it('returns null for @power with empty command', () => {
    const command = parseActionCommand('@power   ');
    expect(command).toBeNull();
  });
});

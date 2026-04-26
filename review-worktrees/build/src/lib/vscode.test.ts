import { describe, expect, it } from 'vitest';

import { buildVsCodeWorkbenchUrl, resolveVsCodeConnectionMode } from './vscode';

describe('vscode helpers', () => {
  it('adds the current project as a folder query when targeting a local server', () => {
    const url = buildVsCodeWorkbenchUrl('http://127.0.0.1:8080', 'E:\\copilothub');
    const parsed = new URL(url);

    expect(parsed.origin).toBe('http://127.0.0.1:8080');
    expect(parsed.searchParams.get('folder')).toBe('E:\\copilothub');
  });

  it('preserves remote URLs without injecting a local folder parameter', () => {
    const url = buildVsCodeWorkbenchUrl('https://vscode.dev', 'E:\\copilothub');
    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://vscode.dev');
    expect(parsed.searchParams.get('folder')).toBeNull();
  });

  it('trims the workspace folder before attaching it to a local server URL', () => {
    const url = buildVsCodeWorkbenchUrl('http://127.0.0.1:8080', '  E:\\copilothub  ');
    const parsed = new URL(url);

    expect(parsed.searchParams.get('folder')).toBe('E:\\copilothub');
  });

  it('returns the original URL when the configured base URL is malformed', () => {
    expect(buildVsCodeWorkbenchUrl('http://127.0.0.1:bad-port', 'E:\\copilothub')).toBe(
      'http://127.0.0.1:bad-port',
    );
  });

  it('resolves connection mode from local server health', () => {
    expect(resolveVsCodeConnectionMode(true)).toBe('local-server');
    expect(resolveVsCodeConnectionMode(false)).toBe('remote-fallback');
  });
});

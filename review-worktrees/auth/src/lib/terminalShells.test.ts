import { describe, expect, it } from 'vitest';
import {
  mergeTerminalShellCatalog,
  resolveTerminalShellSelection,
} from './terminalShells';

describe('terminalShells', () => {
  it('falls back to the first available shell with an explicit notice', () => {
    const catalog = mergeTerminalShellCatalog([
      {
        type: 'powershell',
        available: true,
        command: 'powershell.exe',
        args: ['-NoLogo', '-NoProfile'],
      },
      {
        type: 'git-bash',
        available: false,
        command: null,
        args: [],
        unavailableReason: 'Git Bash was not found in common install locations or PATH.',
      },
    ]);

    const selection = resolveTerminalShellSelection('git-bash', catalog);

    expect(selection.requestedShell.type).toBe('git-bash');
    expect(selection.activeShell?.type).toBe('powershell');
    expect(selection.notice).toContain('Git Bash is unavailable.');
    expect(selection.notice).toContain('Using PowerShell instead.');
  });

  it('returns the preferred shell when it is available', () => {
    const catalog = mergeTerminalShellCatalog([
      {
        type: 'command-prompt',
        available: true,
        command: 'cmd.exe',
        args: [],
      },
    ]);

    const selection = resolveTerminalShellSelection('command-prompt', catalog);

    expect(selection.activeShell?.type).toBe('command-prompt');
    expect(selection.notice).toBeNull();
  });
});


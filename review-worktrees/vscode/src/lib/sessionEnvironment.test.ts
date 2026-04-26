import { describe, expect, it, vi } from 'vitest';

import {
  applySessionExecutionSelectionChange,
  createSessionEnvironment,
  deriveSessionSandbox,
  normalizeSessionExecutionSelection,
} from './sessionEnvironment';

describe('sessionEnvironment', () => {
  it('normalizes WSL selection into a consistent shell and sandbox mode', () => {
    expect(
      normalizeSessionExecutionSelection({
        shellType: 'powershell',
        sandboxMode: 'wsl',
      }),
    ).toEqual({
      shellType: 'wsl',
      sandboxMode: 'wsl',
    });

    expect(
      normalizeSessionExecutionSelection({
        shellType: 'wsl',
      }),
    ).toEqual({
      shellType: 'wsl',
      sandboxMode: 'wsl',
    });

    expect(
      normalizeSessionExecutionSelection({
        shellType: 'wsl',
        sandboxMode: 'windows-sandbox',
      }),
    ).toEqual({
      shellType: 'powershell',
      sandboxMode: 'windows-sandbox',
    });
  });

  it('exits WSL mode when a non-WSL shell is explicitly selected', () => {
    expect(
      applySessionExecutionSelectionChange(
        {
          shellType: 'wsl',
          sandboxMode: 'wsl',
        },
        { shellType: 'powershell' },
      ),
    ).toEqual({
      shellType: 'powershell',
      sandboxMode: 'workspace-write',
    });
  });

  it('derives explicit, conservative sandbox descriptions', () => {
    expect(
      deriveSessionSandbox({
        shellType: 'powershell',
        sandboxMode: 'windows-sandbox',
      }),
    ).toMatchObject({
      executionTarget: 'windows-sandbox',
      launchStrategy: 'windows-sandbox',
    });

    expect(
      deriveSessionSandbox({
        shellType: 'wsl',
        sandboxMode: 'wsl',
      }).summary,
    ).toContain('not a hardened security boundary');
  });

  it('stores derived sandbox metadata on created sessions', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('session-1');

    const session = createSessionEnvironment({
      projectPath: 'E:\\copilothub',
      shellType: 'powershell',
      sandboxMode: 'windows-sandbox',
    });

    expect(session.sandboxMode).toBe('windows-sandbox');
    expect(session.sandbox.executionTarget).toBe('windows-sandbox');
    expect(session.sandbox.warnings).toContain(
      'Session provisioning and attachment remain staged after launch preparation.',
    );
  });
});

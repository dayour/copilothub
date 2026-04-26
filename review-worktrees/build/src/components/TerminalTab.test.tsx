import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { Command } from '@tauri-apps/plugin-shell';
import { TerminalTab } from './TerminalTab';
import { useAppStore } from '../store/appStore';

vi.mock('@xterm/xterm', () => ({
  Terminal: class MockTerminal {
    public write = vi.fn();
    public loadAddon = vi.fn();
    public open = vi.fn();
    public dispose = vi.fn();
    public onData = vi.fn(() => ({
      dispose: vi.fn(),
    }));
  },
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class MockFitAddon {
    public fit = vi.fn();
  },
}));

class MockResizeObserver {
  public observe = vi.fn();
  public disconnect = vi.fn();
}

function mockShellCatalog(
  entries: Array<{
    type: string;
    available: boolean;
    command: string | null;
    args: string[];
    unavailableReason?: string | null;
  }>,
) {
  vi.mocked(invoke).mockImplementation(async (command) => {
    if (command === 'terminal_shell_catalog') {
      return entries;
    }

    return 'mocked';
  });
}

describe('TerminalTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    useAppStore.setState({
      terminalShell: 'powershell',
    });
  });

  it('spawns the preferred shell when it is available', async () => {
    mockShellCatalog([
      {
        type: 'git-bash',
        available: true,
        command: 'C:/Program Files/Git/bin/bash.exe',
        args: ['--login', '-i'],
      },
      {
        type: 'powershell',
        available: true,
        command: 'powershell.exe',
        args: ['-NoLogo', '-NoProfile'],
      },
    ]);
    useAppStore.setState({ terminalShell: 'git-bash' });

    await act(async () => {
      render(<TerminalTab />);
    });

    await waitFor(() => {
      expect(Command.create).toHaveBeenCalledWith(
        'C:/Program Files/Git/bin/bash.exe',
        ['--login', '-i'],
      );
    });

    expect(screen.getByText('Running Git Bash.')).toBeInTheDocument();
  });

  it('falls back to an available shell and updates the preference when reselected', async () => {
    mockShellCatalog([
      {
        type: 'git-bash',
        available: false,
        command: null,
        args: [],
        unavailableReason: 'Git Bash was not found in common install locations or PATH.',
      },
      {
        type: 'powershell',
        available: true,
        command: 'powershell.exe',
        args: ['-NoLogo', '-NoProfile'],
      },
      {
        type: 'command-prompt',
        available: true,
        command: 'cmd.exe',
        args: [],
      },
    ]);
    useAppStore.setState({ terminalShell: 'git-bash' });

    await act(async () => {
      render(<TerminalTab />);
    });

    await waitFor(() => {
      expect(Command.create).toHaveBeenCalledWith('powershell.exe', ['-NoLogo', '-NoProfile']);
    });

    expect(screen.getByText(/Git Bash is unavailable\./)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Terminal shell'), {
      target: { value: 'command-prompt' },
    });

    await waitFor(() => {
      expect(Command.create).toHaveBeenLastCalledWith('cmd.exe', []);
    });

    expect(useAppStore.getState().terminalShell).toBe('command-prompt');
  });

  it('tracks terminal shell preference changes pushed from the store', async () => {
    mockShellCatalog([
      {
        type: 'powershell',
        available: true,
        command: 'powershell.exe',
        args: ['-NoLogo', '-NoProfile'],
      },
      {
        type: 'command-prompt',
        available: true,
        command: 'cmd.exe',
        args: [],
      },
    ]);

    await act(async () => {
      render(<TerminalTab />);
    });

    expect(screen.getByLabelText('Terminal shell')).toHaveValue('powershell');

    act(() => {
      useAppStore.getState().setTerminalShell('command-prompt');
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Terminal shell')).toHaveValue('command-prompt');
    });
  });
});


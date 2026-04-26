import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { SettingsPanel } from './SettingsPanel';
import { useAppStore } from '../store/appStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';

vi.mock('../lib/vscodeServer', () => ({
  getVsCodeServerStatus: vi.fn().mockResolvedValue({
    lifecycle: 'running',
    trackedPid: 4242,
    localUrl: 'http://127.0.0.1:8080',
    healthUrl: 'http://127.0.0.1:8080/healthz',
    healthy: true,
    executableConfigured: true,
    lastError: null,
  }),
  startVsCodeServer: vi.fn(),
  stopVsCodeServer: vi.fn(),
}));

function resetAppStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    theme: 'dark',
    sidebarPosition: 'left',
    verticalTabsEnabled: false,
    projectSidebarCollapsed: false,
    currentProjectPath: 'E:/copilothub',
    recentProjects: ['E:/copilothub'],
    sidecarStatus: 'running',
    isAuthenticated: false,
    commandPaletteOpen: false,
    settingsPanelOpen: true,
    copilotSidebarOpen: false,
    showActionOverlay: true,
    browserUseAutoScreenshot: true,
    browserUseMaxSteps: 50,
    connectedSdkSession: 'sdk-session-1',
    actionTimelineDocked: 'right',
    defaultEditor: 'vscode',
    terminalShell: 'powershell',
    sandboxMode: 'workspace-write',
    approvalPolicy: 'on-request',
    ...overrides,
  });
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    resetAppStore();
    vi.clearAllMocks();
    const selectedSessionId = useSessionEnvironmentStore.getState().selectedSession()?.id;
    if (selectedSessionId) {
      useSessionEnvironmentStore.getState().updateSession(selectedSessionId, {
        projectPath: 'E:/copilothub',
        shellType: 'powershell',
        sandboxMode: 'workspace-write',
      });
    }
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'terminal_shell_catalog') {
        return [
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
          {
            type: 'git-bash',
            available: false,
            command: null,
            args: [],
            unavailableReason: 'Git Bash was not found in common install locations or PATH.',
          },
          {
            type: 'wsl',
            available: false,
            command: null,
            args: [],
            unavailableReason: 'wsl.exe was not found.',
          },
          {
            type: 'bash',
            available: false,
            command: null,
            args: [],
            unavailableReason: 'Use Git Bash or WSL for Linux-style shells on Windows.',
          },
        ];
      }

      if (command === 'sandbox_catalog') {
        return [
          {
            id: 'windows-sandbox',
            label: 'Windows Sandbox',
            available: true,
            command: 'C:\\Windows\\System32\\WindowsSandbox.exe',
            summary: 'Disposable Windows VM entry point for explicit launch preparation.',
            unavailableReason: null,
          },
          {
            id: 'wsl',
            label: 'WSL',
            available: false,
            command: null,
            summary: 'Linux execution target through Windows Subsystem for Linux.',
            unavailableReason: 'wsl.exe was not found.',
          },
        ];
      }

      if (command === 'sandbox_prepare_session_launch') {
        return {
          sandboxMode: 'workspace-write',
          executionTarget: 'host',
          available: true,
          launchStrategy: 'host',
          launcherCommand: null,
          launcherArgs: [],
          workingDirectory: 'E:/copilothub',
          configPath: null,
          summary:
            'Commands run on the host OS and are expected to stay within the selected workspace path. This is a workflow convention, not an operating system sandbox.',
          warnings: [
            'No VM or container isolation is applied.',
            'Host processes may still reach resources outside the workspace if invoked to do so.',
          ],
        };
      }

      return 'mocked';
    });
  });

  async function renderPanel() {
    await act(async () => {
      render(<SettingsPanel />);
    });
  }

  it('does not render when closed', () => {
    resetAppStore({ settingsPanelOpen: false });

    render(<SettingsPanel />);

    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('renders general settings and updates theme preference', async () => {
    await renderPanel();

    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Environment' })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Edge Light'));

    expect(useAppStore.getState().theme).toBe('light');
  });

  it('updates the preferred terminal shell and marks unavailable shells explicitly', async () => {
    await renderPanel();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Git Bash (Unavailable)' })).toBeDisabled();
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Preferred terminal shell'), {
        target: { value: 'command-prompt' },
      });
    });

    expect(useAppStore.getState().terminalShell).toBe('command-prompt');
  });

  it('opens the integrations section with Entra and Graph status', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Integrations' }));

    expect(screen.getByText('Microsoft Entra ID')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Graph')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows environment status including VS Code local host details', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));

    await waitFor(() => {
      expect(screen.getByText(/Tracked PID: 4242/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Connected SDK session: sdk-session-1/)).toBeInTheDocument();
    expect(screen.getByText(/Executable configured: Yes/)).toBeInTheDocument();
  });

  it('shows explicit sandbox details and applies mode changes to the active session', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Environment' }));

    await waitFor(() => {
      expect(screen.getByText('Active isolation profile')).toBeInTheDocument();
      expect(screen.getAllByText('Windows Sandbox').length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Execution target: host/)).toBeInTheDocument();
    expect(screen.getByText(/No VM or container isolation is applied/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Windows Sandbox'));
    });

    expect(useAppStore.getState().sandboxMode).toBe('windows-sandbox');
    expect(useSessionEnvironmentStore.getState().selectedSession()?.sandboxMode).toBe(
      'windows-sandbox',
    );
  });

  it('closes when the close button is clicked', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Close settings panel' }));

    expect(useAppStore.getState().settingsPanelOpen).toBe(false);
  });

  it('closes when Escape is pressed', async () => {
    await renderPanel();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(useAppStore.getState().settingsPanelOpen).toBe(false);
  });
});

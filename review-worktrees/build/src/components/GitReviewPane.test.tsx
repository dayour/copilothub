import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Command } from '@tauri-apps/plugin-shell';
import { GitReviewPane } from './GitReviewPane';
import { useAppStore } from '../store/appStore';

function mockGitExecution(results: Array<{ code: number | null; stdout: string; stderr: string }>) {
  vi.mocked(Command.create).mockImplementation((_program: string, _args?: string | string[]) => ({
    execute: vi.fn().mockResolvedValue(results.shift() ?? {
      code: 0,
      signal: null,
      stdout: '',
      stderr: '',
    }),
  }) as ReturnType<typeof Command.create>);
}

describe('GitReviewPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      theme: 'dark',
      sidebarPosition: 'left',
      verticalTabsEnabled: false,
      projectSidebarCollapsed: false,
      currentProjectPath: 'E:/copilothub',
      recentProjects: ['E:/copilothub'],
      sidecarStatus: 'stopped',
      isAuthenticated: false,
      commandPaletteOpen: false,
      settingsPanelOpen: false,
      copilotSidebarOpen: true,
      assistantPaneMode: 'review',
      showActionOverlay: true,
      browserUseAutoScreenshot: true,
      browserUseMaxSteps: 50,
      connectedSdkSession: null,
      actionTimelineDocked: 'right',
      defaultEditor: 'vscode',
      terminalShell: 'powershell',
      sandboxMode: 'workspace-write',
      approvalPolicy: 'on-request',
    });
  });

  it('shows an explicit empty state when no project is selected', () => {
    useAppStore.setState({ currentProjectPath: null });

    render(<GitReviewPane />);

    expect(screen.getByText(/choose a project folder/i)).toBeInTheDocument();
    expect(Command.create).not.toHaveBeenCalled();
  });

  it('shows an explicit non-git state', async () => {
    mockGitExecution([
      {
        code: 128,
        stdout: '',
        stderr: 'fatal: not a git repository (or any of the parent directories): .git',
      },
    ]);

    render(<GitReviewPane />);

    expect(await screen.findByText(/not a git repository/i)).toBeInTheDocument();
    expect(screen.getByText(/initialize git or switch/i)).toBeInTheDocument();
  });

  it('shows a clean working tree state', async () => {
    mockGitExecution([
      {
        code: 0,
        stdout: 'E:/copilothub\n',
        stderr: '',
      },
      {
        code: 0,
        stdout: '## main...origin/main\n',
        stderr: '',
      },
    ]);

    render(<GitReviewPane />);

    expect(await screen.findByText(/no local changes/i)).toBeInTheDocument();
    expect(screen.getByText(/working tree and index are clean/i)).toBeInTheDocument();
  });

  it('renders changed files and diff sections for dirty repositories', async () => {
    mockGitExecution([
      {
        code: 0,
        stdout: 'E:/copilothub\n',
        stderr: '',
      },
      {
        code: 0,
        stdout: '## main...origin/main [ahead 1]\nM  src/App.tsx\n?? src/components/GitReviewPane.tsx\n',
        stderr: '',
      },
      {
        code: 0,
        stdout: 'diff --git a/src/App.tsx b/src/App.tsx\n+added line\n',
        stderr: '',
      },
      {
        code: 0,
        stdout: 'diff --git a/src/App.tsx b/src/App.tsx\n-modified line\n',
        stderr: '',
      },
    ]);

    render(<GitReviewPane />);

    expect(await screen.findByText('main...origin/main [ahead 1]')).toBeInTheDocument();
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('src/components/GitReviewPane.tsx')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Staged Diff')).toBeInTheDocument();
      expect(screen.getByText('Working Tree Diff')).toBeInTheDocument();
    });
  });
});

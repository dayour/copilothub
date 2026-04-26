import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { VSCodeTab } from './VSCodeTab';
import { useAppStore } from '../store/appStore';

const {
  getVsCodeServerStatusMock,
  startVsCodeServerMock,
  getVsCodeExtensionHostStatusMock,
  listVsCodeExtensionsMock,
} = vi.hoisted(() => ({
  getVsCodeServerStatusMock: vi.fn(),
  startVsCodeServerMock: vi.fn(),
  getVsCodeExtensionHostStatusMock: vi.fn(),
  listVsCodeExtensionsMock: vi.fn(),
}));

vi.mock('../lib/vscodeServer', () => ({
  getVsCodeServerStatus: getVsCodeServerStatusMock,
  startVsCodeServer: startVsCodeServerMock,
}));

vi.mock('../lib/vscodeExtensions', () => ({
  getVsCodeExtensionHostStatus: getVsCodeExtensionHostStatusMock,
  listVsCodeExtensions: listVsCodeExtensionsMock,
}));

function resetAppStore() {
  useAppStore.setState({
    currentProjectPath: null,
    recentProjects: [],
  });
}

describe('VSCodeTab', () => {
  beforeEach(() => {
    resetAppStore();
    vi.clearAllMocks();

    getVsCodeServerStatusMock.mockResolvedValue({
      lifecycle: 'stopped',
      trackedPid: null,
      localUrl: 'http://127.0.0.1:8080',
      healthUrl: 'http://127.0.0.1:8080/healthz',
      healthy: false,
      executableConfigured: true,
      lastError: 'offline',
    });

    startVsCodeServerMock.mockResolvedValue({
      lifecycle: 'running',
      trackedPid: 4242,
      localUrl: 'http://127.0.0.1:8080',
      healthUrl: 'http://127.0.0.1:8080/healthz',
      healthy: true,
      executableConfigured: true,
      lastError: null,
    });

    getVsCodeExtensionHostStatusMock.mockResolvedValue({
      readiness: 'discovery-ready',
      hostApiAvailable: true,
      canExecuteExtensions: false,
      executionStage: 'metadata-only',
      extensionDirectory: 'E:\\copilothub\\.copilothub\\extensions',
      extensionDirectoryExists: true,
      discoveredExtensionCount: 2,
      invalidEntryCount: 0,
      localServerHealthy: false,
      executableConfigured: true,
      summary: 'Discovered 2 local extension manifests. Runtime execution is staged.',
      lastError: null,
      remainingGaps: ['Runtime activation remains staged.'],
    });

    listVsCodeExtensionsMock.mockResolvedValue({
      loadContract: {
        discoveryMode: 'directory',
        manifestFileName: 'package.json',
        executionStage: 'metadata-only',
        supportsRuntimeExecution: false,
        configuredExtensionDirectory: 'E:\\copilothub\\.copilothub\\extensions',
      },
      extensionDirectory: 'E:\\copilothub\\.copilothub\\extensions',
      extensionDirectoryExists: true,
      extensions: [
        {
          id: 'darbotlabs.copilothub-tools',
          name: 'copilothub-tools',
          publisher: 'darbotlabs',
          version: '0.1.0',
          displayName: 'CopilotHub Tools',
          description: 'Commands for CopilotHub.',
          path: 'E:\\copilothub\\.copilothub\\extensions\\copilothub-tools',
          manifestPath: 'E:\\copilothub\\.copilothub\\extensions\\copilothub-tools\\package.json',
          readmePath: null,
          categories: ['Other'],
          keywords: ['copilothub'],
          extensionKind: ['workspace'],
          activationEvents: ['onStartupFinished'],
          entryPoints: {
            main: './dist/extension.js',
            browser: null,
          },
          contributes: {
            commands: 3,
            languages: 0,
            debuggers: 0,
            views: 1,
          },
          warnings: [],
        },
        {
          id: 'darbotlabs.theme-pack',
          name: 'theme-pack',
          publisher: 'darbotlabs',
          version: '0.2.0',
          displayName: 'Theme Pack',
          description: 'Color themes for CopilotHub.',
          path: 'E:\\copilothub\\.copilothub\\extensions\\theme-pack',
          manifestPath: 'E:\\copilothub\\.copilothub\\extensions\\theme-pack\\package.json',
          readmePath: 'E:\\copilothub\\.copilothub\\extensions\\theme-pack\\README.md',
          categories: ['Themes'],
          keywords: ['theme', 'colors'],
          extensionKind: ['ui'],
          activationEvents: ['*'],
          entryPoints: {
            main: null,
            browser: null,
          },
          contributes: {
            commands: 0,
            languages: 0,
            debuggers: 0,
            views: 0,
          },
          warnings: [],
        },
      ],
      invalidEntries: [],
    });
  });

  it('renders a practical local extension manager beside the fallback workbench', async () => {
    render(<VSCodeTab tabId="vscode-tab" isActive />);

    await waitFor(() => {
      expect(screen.getByText('VS Code remote fallback active')).toBeInTheDocument();
    });

    expect(screen.getByText('VS Code extensions')).toBeInTheDocument();
    expect(screen.getByText('Marketplace installs are not supported yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open extension folder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal selected extension' })).toBeInTheDocument();
    expect(screen.getByText('Discovered')).toBeInTheDocument();
    expect(screen.getByText('Runtime activation remains staged.')).toBeInTheDocument();
    expect(screen.getAllByText('CopilotHub Tools').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Theme Pack').length).toBeGreaterThan(0);

    const iframe = screen.getByTitle('VS Code');
    expect(iframe).toHaveAttribute('src', 'https://vscode.dev');
    expect(screen.getByRole('button', { name: 'Start local server' })).toBeInTheDocument();
  });

  it('filters discovered extensions and shows selected extension details', async () => {
    render(<VSCodeTab tabId="vscode-tab" isActive />);

    await screen.findByText('Theme Pack');

    fireEvent.change(screen.getByLabelText('Search local extensions'), {
      target: { value: 'theme colors' },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Theme Pack').length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('CopilotHub Tools')).not.toBeInTheDocument();
    expect(screen.getAllByText('Metadata only').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Open selected README' })).toBeEnabled();
  });

  it('starts the local server and routes the current project into the local workbench', async () => {
    useAppStore.getState().setCurrentProject('E:\\copilothub');

    render(<VSCodeTab tabId="vscode-tab" isActive />);

    fireEvent.click(await screen.findByRole('button', { name: 'Start local server' }));

    await waitFor(() => {
      expect(startVsCodeServerMock).toHaveBeenCalledWith('E:\\copilothub');
    });

    await waitFor(() => {
      expect(screen.getByText('Local VS Code server active')).toBeInTheDocument();
    });

    const iframe = screen.getByTitle('VS Code');
    expect(iframe.getAttribute('src')).toContain('http://127.0.0.1:8080/');
    expect(iframe.getAttribute('src')).toContain('folder=E%3A%5Ccopilothub');
  });
});

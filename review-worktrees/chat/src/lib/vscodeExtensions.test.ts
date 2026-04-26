import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';

vi.mock('./tauri', () => ({
  isTauri: true,
}));

import { getVsCodeExtensionHostStatus, listVsCodeExtensions } from './vscodeExtensions';

describe('vscodeExtensions bridge', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it('loads extension host readiness through the Tauri bridge', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      readiness: 'discovery-ready',
      hostApiAvailable: true,
      canExecuteExtensions: false,
      executionStage: 'metadata-only',
      extensionDirectory: 'E:\\copilothub\\.copilothub\\extensions',
      extensionDirectoryExists: true,
      discoveredExtensionCount: 2,
      invalidEntryCount: 1,
      localServerHealthy: false,
      executableConfigured: true,
      summary: 'Discovered 2 extension manifests while the local host is offline.',
      lastError: null,
      remainingGaps: ['Extension activation is staged.'],
    });

    const status = await getVsCodeExtensionHostStatus('E:\\copilothub');

    expect(invoke).toHaveBeenCalledWith('vscode_extension_host_status', {
      projectPath: 'E:\\copilothub',
    });
    expect(status.readiness).toBe('discovery-ready');
    expect(status.discoveredExtensionCount).toBe(2);
    expect(status.executionStage).toBe('metadata-only');
  });

  it('lists discovered local extensions through the Tauri bridge', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
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
            browser: './dist/web.js',
          },
          contributes: {
            commands: 3,
            languages: 0,
            debuggers: 0,
            views: 1,
          },
          warnings: [],
        },
      ],
      invalidEntries: [
        {
          path: 'E:\\copilothub\\.copilothub\\extensions\\broken-extension',
          message: 'package.json is missing',
        },
      ],
    });

    const discovery = await listVsCodeExtensions('E:\\copilothub');

    expect(invoke).toHaveBeenCalledWith('vscode_extension_list', {
      projectPath: 'E:\\copilothub',
    });
    expect(discovery.extensions).toHaveLength(1);
    expect(discovery.extensions[0].entryPoints.main).toBe('./dist/extension.js');
    expect(discovery.invalidEntries[0].message).toContain('missing');
  });
});

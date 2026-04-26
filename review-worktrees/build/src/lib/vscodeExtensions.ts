import { invoke } from '@tauri-apps/api/core';

import { APP_CONFIG } from './config';
import { isTauri } from './tauri';

export type VsCodeExtensionHostReadiness = 'unavailable' | 'discovery-ready' | 'host-ready';
export type VsCodeExtensionExecutionStage = 'metadata-only';

export interface VsCodeExtensionEntryPoints {
  main: string | null;
  browser: string | null;
}

export interface VsCodeExtensionContributionSummary {
  commands: number;
  languages: number;
  debuggers: number;
  views: number;
}

export interface VsCodeLocalExtension {
  id: string;
  name: string;
  publisher: string | null;
  version: string;
  displayName: string | null;
  description: string | null;
  path: string;
  manifestPath: string;
  readmePath: string | null;
  categories: string[];
  keywords: string[];
  extensionKind: string[];
  activationEvents: string[];
  entryPoints: VsCodeExtensionEntryPoints;
  contributes: VsCodeExtensionContributionSummary;
  warnings: string[];
}

export interface VsCodeExtensionDiscoveryProblem {
  path: string;
  message: string;
}

export interface VsCodeExtensionLoadContract {
  discoveryMode: 'directory';
  manifestFileName: 'package.json';
  executionStage: VsCodeExtensionExecutionStage;
  supportsRuntimeExecution: boolean;
  configuredExtensionDirectory: string | null;
}

export interface VsCodeExtensionDiscoveryResult {
  loadContract: VsCodeExtensionLoadContract;
  extensionDirectory: string | null;
  extensionDirectoryExists: boolean;
  extensions: VsCodeLocalExtension[];
  invalidEntries: VsCodeExtensionDiscoveryProblem[];
}

export interface VsCodeExtensionHostStatus {
  readiness: VsCodeExtensionHostReadiness;
  hostApiAvailable: boolean;
  canExecuteExtensions: boolean;
  executionStage: VsCodeExtensionExecutionStage;
  extensionDirectory: string | null;
  extensionDirectoryExists: boolean;
  discoveredExtensionCount: number;
  invalidEntryCount: number;
  localServerHealthy: boolean;
  executableConfigured: boolean;
  summary: string;
  lastError: string | null;
  remainingGaps: string[];
}

function resolveDirectoryHint(projectPath?: string | null): string | null {
  const trimmed = projectPath?.trim();
  if (!trimmed) {
    return null;
  }

  const separator = trimmed.includes('\\') ? '\\' : '/';
  const relativeDir = APP_CONFIG.vsCodeExtensionsRelativeDir.replace(/[\\/]/g, separator);
  return `${trimmed.replace(/[\\/]+$/, '')}${separator}${relativeDir}`;
}

function createFallbackLoadContract(projectPath?: string | null): VsCodeExtensionLoadContract {
  return {
    discoveryMode: 'directory',
    manifestFileName: 'package.json',
    executionStage: 'metadata-only',
    supportsRuntimeExecution: false,
    configuredExtensionDirectory: resolveDirectoryHint(projectPath),
  };
}

function createBrowserFallbackHostStatus(projectPath?: string | null): VsCodeExtensionHostStatus {
  const extensionDirectory = resolveDirectoryHint(projectPath);

  return {
    readiness: 'unavailable',
    hostApiAvailable: false,
    canExecuteExtensions: false,
    executionStage: 'metadata-only',
    extensionDirectory,
    extensionDirectoryExists: false,
    discoveredExtensionCount: 0,
    invalidEntryCount: 0,
    localServerHealthy: false,
    executableConfigured: false,
    summary: extensionDirectory
      ? `Extension discovery is only available inside the Tauri shell. Expected local directory: ${extensionDirectory}`
      : 'Open a local project inside the Tauri shell to discover VS Code extensions.',
    lastError: null,
    remainingGaps: [
      'Browser-only mode cannot scan the local extension directory.',
      'Extension activation still requires the native VS Code host integration.',
    ],
  };
}

function createBrowserFallbackDiscovery(projectPath?: string | null): VsCodeExtensionDiscoveryResult {
  const extensionDirectory = resolveDirectoryHint(projectPath);

  return {
    loadContract: createFallbackLoadContract(projectPath),
    extensionDirectory,
    extensionDirectoryExists: false,
    extensions: [],
    invalidEntries: [],
  };
}

export async function getVsCodeExtensionHostStatus(
  projectPath?: string | null,
): Promise<VsCodeExtensionHostStatus> {
  if (!isTauri) {
    return createBrowserFallbackHostStatus(projectPath);
  }

  return invoke<VsCodeExtensionHostStatus>('vscode_extension_host_status', {
    projectPath: projectPath ?? null,
  });
}

export async function listVsCodeExtensions(
  projectPath?: string | null,
): Promise<VsCodeExtensionDiscoveryResult> {
  if (!isTauri) {
    return createBrowserFallbackDiscovery(projectPath);
  }

  return invoke<VsCodeExtensionDiscoveryResult>('vscode_extension_list', {
    projectPath: projectPath ?? null,
  });
}

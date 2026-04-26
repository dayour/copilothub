import { invoke } from '@tauri-apps/api/core';

import type {
  SessionExecutionTarget,
  SessionSandbox,
  SessionSandboxMode,
  SessionShellType,
} from './sessionEnvironment';
import { deriveSessionSandbox } from './sessionEnvironment';

export type SandboxProviderId = 'windows-sandbox' | 'wsl';

export interface SandboxProviderCatalogEntry {
  id: SandboxProviderId;
  label: string;
  available: boolean;
  command: string | null;
  summary: string;
  unavailableReason: string | null;
}

export interface SandboxLaunchPlanRequest {
  sandboxMode: SessionSandboxMode;
  shellType: SessionShellType;
  projectPath: string;
  envVars?: Record<string, string>;
}

export interface SandboxLaunchPlan {
  sandboxMode: SessionSandboxMode;
  executionTarget: SessionExecutionTarget;
  available: boolean;
  launchStrategy: SessionExecutionTarget;
  launcherCommand: string | null;
  launcherArgs: string[];
  workingDirectory: string | null;
  configPath: string | null;
  summary: string;
  warnings: string[];
}

const SANDBOX_PROVIDER_DEFINITIONS: Record<
  SandboxProviderId,
  Pick<SandboxProviderCatalogEntry, 'label' | 'summary'>
> = {
  'windows-sandbox': {
    label: 'Windows Sandbox',
    summary: 'Disposable Windows VM entry point for explicit launch preparation.',
  },
  wsl: {
    label: 'WSL',
    summary: 'Linux execution target through Windows Subsystem for Linux.',
  },
};

function createUnavailableCatalogEntry(id: SandboxProviderId, reason: string): SandboxProviderCatalogEntry {
  const definition = SANDBOX_PROVIDER_DEFINITIONS[id];
  return {
    id,
    label: definition.label,
    available: false,
    command: null,
    summary: definition.summary,
    unavailableReason: reason,
  };
}

export function createFallbackSandboxCatalog(): SandboxProviderCatalogEntry[] {
  return [
    createUnavailableCatalogEntry(
      'windows-sandbox',
      'Sandbox discovery requires the native CopilotHub runtime.',
    ),
    createUnavailableCatalogEntry('wsl', 'WSL discovery requires the native CopilotHub runtime.'),
  ];
}

function normalizeCatalogEntry(
  id: SandboxProviderId,
  partial: Partial<SandboxProviderCatalogEntry> | undefined,
): SandboxProviderCatalogEntry {
  const definition = SANDBOX_PROVIDER_DEFINITIONS[id];

  return {
    id,
    label: partial?.label ?? definition.label,
    available: partial?.available === true,
    command: partial?.command ?? null,
    summary: partial?.summary ?? definition.summary,
    unavailableReason: partial?.unavailableReason ?? null,
  };
}

export function mergeSandboxCatalog(
  catalog: Array<Partial<SandboxProviderCatalogEntry> & { id: SandboxProviderId }>,
): SandboxProviderCatalogEntry[] {
  return (Object.keys(SANDBOX_PROVIDER_DEFINITIONS) as SandboxProviderId[]).map((id) =>
    normalizeCatalogEntry(
      id,
      catalog.find((entry) => entry.id === id),
    ),
  );
}

export async function fetchSandboxCatalog(): Promise<SandboxProviderCatalogEntry[]> {
  try {
    const catalog = await invoke<
      Array<Partial<SandboxProviderCatalogEntry> & { id: SandboxProviderId }>
    >('sandbox_catalog');
    return mergeSandboxCatalog(catalog);
  } catch {
    return createFallbackSandboxCatalog();
  }
}

function buildHostLaunchPlan(
  request: SandboxLaunchPlanRequest,
  sandbox: SessionSandbox,
): SandboxLaunchPlan {
  return {
    sandboxMode: request.sandboxMode,
    executionTarget: sandbox.executionTarget,
    available: true,
    launchStrategy: sandbox.launchStrategy,
    launcherCommand: null,
    launcherArgs: [],
    workingDirectory: request.projectPath || null,
    configPath: null,
    summary: sandbox.summary,
    warnings: sandbox.warnings,
  };
}

export async function prepareSandboxLaunchPlan(
  request: SandboxLaunchPlanRequest,
): Promise<SandboxLaunchPlan> {
  const sandbox = deriveSessionSandbox({
    shellType: request.shellType,
    sandboxMode: request.sandboxMode,
  });

  if (request.sandboxMode === 'workspace-write' || request.sandboxMode === 'full-access') {
    return buildHostLaunchPlan(request, sandbox);
  }

  try {
    return await invoke<SandboxLaunchPlan>('sandbox_prepare_session_launch', {
      request: {
        sandboxMode: request.sandboxMode,
        shellType: request.shellType,
        projectPath: request.projectPath,
        envVars: request.envVars ?? {},
      },
    });
  } catch {
    return {
      sandboxMode: request.sandboxMode,
      executionTarget: sandbox.executionTarget,
      available: false,
      launchStrategy: sandbox.launchStrategy,
      launcherCommand: null,
      launcherArgs: [],
      workingDirectory: request.projectPath || null,
      configPath: null,
      summary: sandbox.summary,
      warnings: [
        ...sandbox.warnings,
        'Sandbox launch preparation requires the native CopilotHub runtime.',
      ],
    };
  }
}

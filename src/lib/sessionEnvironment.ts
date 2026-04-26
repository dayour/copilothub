// ---------------------------------------------------------------------------
// sessionEnvironment.ts -- Typed session environment model and helpers for
// CopilotHub project/workspace execution contexts.
// ---------------------------------------------------------------------------

export type SessionShellType =
  | 'powershell'
  | 'command-prompt'
  | 'git-bash'
  | 'wsl'
  | 'bash';

export type SessionSandboxMode =
  | 'workspace-write'
  | 'full-access'
  | 'windows-sandbox'
  | 'wsl';

export type SessionExecutionTarget = 'host' | 'wsl' | 'windows-sandbox';

export type SessionIsolationLevel =
  | 'workspace-write'
  | 'host-full-access'
  | 'wsl-shared-host'
  | 'windows-sandbox-vm';

export interface SessionSandbox {
  executionTarget: SessionExecutionTarget;
  isolationLevel: SessionIsolationLevel;
  launchStrategy: SessionExecutionTarget;
  summary: string;
  warnings: string[];
}

export interface SessionEnvironment {
  id: string;
  name: string;
  projectPath: string;
  shellType: SessionShellType;
  sandboxMode: SessionSandboxMode;
  sandbox: SessionSandbox;
  envVars: Record<string, string>;
  browserSessionId: string | null;
  mcpSessionIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SessionEnvironmentInput {
  id?: string;
  name?: string;
  projectPath?: string;
  shellType?: SessionShellType;
  sandboxMode?: SessionSandboxMode;
  envVars?: Record<string, string>;
  browserSessionId?: string | null;
  mcpSessionIds?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface SessionExecutionSelection {
  shellType: SessionShellType;
  sandboxMode: SessionSandboxMode;
}

interface GlobalRuntimeHints {
  __COPILOTHUB_PROJECT_PATH__?: string;
  process?: {
    cwd?: () => string;
    env?: Record<string, string | undefined>;
    platform?: string;
  };
  navigator?: {
    userAgent?: string;
  };
}

function getGlobalRuntimeHints(): GlobalRuntimeHints {
  return globalThis as GlobalRuntimeHints;
}

function firstDefinedString(...values: Array<string | null | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    unique.push(value);
  }

  return unique;
}

export function getPathBaseName(path: string): string {
  const trimmed = path.trim().replace(/[\\/]+$/, '');
  if (!trimmed) return '';

  const segments = trimmed.split(/[\\/]/);
  return segments[segments.length - 1] ?? '';
}

export function resolveDefaultProjectPath(): string {
  const runtime = getGlobalRuntimeHints();
  const env = import.meta.env as Record<string, string | undefined>;

  return (
    firstDefinedString(
      runtime.__COPILOTHUB_PROJECT_PATH__,
      env.VITE_COPILOTHUB_PROJECT_PATH,
      runtime.process?.env?.COPILOTHUB_PROJECT_PATH,
      runtime.process?.cwd?.(),
    ) ?? ''
  );
}

export function resolveDefaultShellType(): SessionShellType {
  const runtime = getGlobalRuntimeHints();
  const platform = runtime.process?.platform;
  const userAgent = runtime.navigator?.userAgent?.toLowerCase();
  const isWindows =
    platform === 'win32' ||
    platform === 'windows' ||
    userAgent?.includes('windows') === true;

  return isWindows ? 'powershell' : 'bash';
}

function resolveNonWslShellFallback(shellType: SessionShellType): SessionShellType {
  if (shellType !== 'wsl') {
    return shellType;
  }

  const fallback = resolveDefaultShellType();
  return fallback === 'wsl' ? 'powershell' : fallback;
}

export function normalizeSessionExecutionSelection(
  selection: Partial<SessionExecutionSelection>,
  baseSelection: SessionExecutionSelection = {
    shellType: resolveDefaultShellType(),
    sandboxMode: 'workspace-write',
  },
): SessionExecutionSelection {
  let shellType = selection.shellType ?? baseSelection.shellType;
  let sandboxMode = selection.sandboxMode ?? baseSelection.sandboxMode;

  const explicitSandboxMode = selection.sandboxMode;

  if (sandboxMode === 'wsl') {
    shellType = 'wsl';
  } else if (shellType === 'wsl' && explicitSandboxMode === undefined) {
    sandboxMode = 'wsl';
  } else if (shellType === 'wsl') {
    shellType = resolveNonWslShellFallback(baseSelection.shellType);
  }

  if (sandboxMode === 'windows-sandbox' && shellType === 'bash') {
    shellType = resolveNonWslShellFallback(baseSelection.shellType);
    if (shellType === 'bash') {
      shellType = 'powershell';
    }
  }

  return { shellType, sandboxMode };
}

export function applySessionExecutionSelectionChange(
  current: SessionExecutionSelection,
  updates: Partial<SessionExecutionSelection>,
): SessionExecutionSelection {
  let shellType = updates.shellType ?? current.shellType;
  let sandboxMode = updates.sandboxMode ?? current.sandboxMode;

  if (updates.sandboxMode === 'wsl') {
    shellType = 'wsl';
  } else if (updates.sandboxMode !== undefined && shellType === 'wsl') {
    shellType = resolveNonWslShellFallback(current.shellType);
  }

  if (updates.shellType === 'wsl' && updates.sandboxMode === undefined) {
    sandboxMode = 'wsl';
  } else if (
    updates.shellType !== undefined &&
    updates.shellType !== 'wsl' &&
    sandboxMode === 'wsl' &&
    updates.sandboxMode === undefined
  ) {
    sandboxMode = 'workspace-write';
  }

  return normalizeSessionExecutionSelection(
    { shellType, sandboxMode },
    {
      shellType: resolveNonWslShellFallback(current.shellType),
      sandboxMode: current.sandboxMode,
    },
  );
}

export function deriveSessionSandbox(
  selection: SessionExecutionSelection,
): SessionSandbox {
  if (selection.sandboxMode === 'full-access') {
    return {
      executionTarget: 'host',
      isolationLevel: 'host-full-access',
      launchStrategy: 'host',
      summary:
        'Commands run directly on the host with the current user account. CopilotHub does not apply filesystem or VM isolation in this mode.',
      warnings: [
        'No operating system sandbox is applied.',
        'Processes inherit the current user profile and host access.',
      ],
    };
  }

  if (selection.sandboxMode === 'wsl') {
    return {
      executionTarget: 'wsl',
      isolationLevel: 'wsl-shared-host',
      launchStrategy: 'wsl',
      summary:
        'Commands are routed toward a WSL Linux environment when available. This is an alternate execution target, not a hardened security boundary.',
      warnings: [
        'WSL can access mounted Windows files depending on distro configuration.',
        'Host networking and user trust still apply.',
      ],
    };
  }

  if (selection.sandboxMode === 'windows-sandbox') {
    return {
      executionTarget: 'windows-sandbox',
      isolationLevel: 'windows-sandbox-vm',
      launchStrategy: 'windows-sandbox',
      summary:
        'CopilotHub can prepare a Windows Sandbox launch for this session. The sandbox VM is disposable, but mapped folders still bridge data with the host.',
      warnings: [
        'Session provisioning and attachment remain staged after launch preparation.',
        'Mapped workspace folders can still expose host files to the sandbox.',
      ],
    };
  }

  return {
    executionTarget: 'host',
    isolationLevel: 'workspace-write',
    launchStrategy: 'host',
    summary:
      'Commands run on the host OS and are expected to stay within the selected workspace path. This is a workflow convention, not an operating system sandbox.',
    warnings: [
      'No VM or container isolation is applied.',
      'Host processes may still reach resources outside the workspace if invoked to do so.',
    ],
  };
}

export function createSessionEnvironment(
  input: SessionEnvironmentInput = {},
): SessionEnvironment {
  const now = Date.now();
  const projectPath = input.projectPath?.trim() ?? resolveDefaultProjectPath();
  const baseName = getPathBaseName(projectPath);
  const createdAt = input.createdAt ?? now;
  const execution = normalizeSessionExecutionSelection({
    shellType: input.shellType,
    sandboxMode: input.sandboxMode,
  });

  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name?.trim() || baseName || 'Current Workspace',
    projectPath,
    shellType: execution.shellType,
    sandboxMode: execution.sandboxMode,
    sandbox: deriveSessionSandbox(execution),
    envVars: { ...(input.envVars ?? {}) },
    browserSessionId: input.browserSessionId ?? null,
    mcpSessionIds: uniqueStrings(input.mcpSessionIds ?? []),
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}

export function createDefaultSessionEnvironment(
  projectPath = resolveDefaultProjectPath(),
  input: Omit<SessionEnvironmentInput, 'projectPath'> = {},
): SessionEnvironment {
  return createSessionEnvironment({ ...input, projectPath });
}

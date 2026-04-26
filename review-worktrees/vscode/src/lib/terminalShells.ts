import { invoke } from '@tauri-apps/api/core';
import type { SessionShellType } from './sessionEnvironment';

export interface TerminalShellDefinition {
  type: SessionShellType;
  label: string;
  description: string;
}

export interface TerminalShellCatalogEntry extends TerminalShellDefinition {
  available: boolean;
  command: string | null;
  args: string[];
  unavailableReason: string | null;
}

export interface ResolvedTerminalShellSelection {
  requestedShell: TerminalShellCatalogEntry;
  activeShell: TerminalShellCatalogEntry | null;
  notice: string | null;
}

const TERMINAL_SHELL_DEFINITIONS: TerminalShellDefinition[] = [
  {
    type: 'powershell',
    label: 'PowerShell',
    description: 'Best default for Windows-native workflows.',
  },
  {
    type: 'command-prompt',
    label: 'Command Prompt',
    description: 'Classic cmd.exe compatibility.',
  },
  {
    type: 'git-bash',
    label: 'Git Bash',
    description: 'POSIX-style shell from Git for Windows.',
  },
  {
    type: 'wsl',
    label: 'WSL',
    description: 'Linux shell through Windows Subsystem for Linux.',
  },
  {
    type: 'bash',
    label: 'Bash',
    description: 'Generic POSIX shell for non-Windows hosts.',
  },
];

function isWindowsHost(): boolean {
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('windows')) {
    return true;
  }

  const runtime = globalThis as {
    process?: {
      platform?: string;
    };
  };

  return runtime.process?.platform === 'win32' || runtime.process?.platform === 'windows';
}

function findDefinition(shellType: SessionShellType): TerminalShellDefinition {
  return (
    TERMINAL_SHELL_DEFINITIONS.find((definition) => definition.type === shellType) ??
    TERMINAL_SHELL_DEFINITIONS[0]
  );
}

export function createFallbackTerminalShellCatalog(): TerminalShellCatalogEntry[] {
  const isWindows = isWindowsHost();

  return TERMINAL_SHELL_DEFINITIONS.map((definition) => {
    if (definition.type === 'powershell') {
      return {
        ...definition,
        available: isWindows,
        command: isWindows ? 'powershell.exe' : null,
        args: isWindows ? ['-NoLogo', '-NoProfile'] : [],
        unavailableReason: isWindows ? null : 'PowerShell desktop shell is only auto-detected on Windows hosts.',
      };
    }

    if (definition.type === 'command-prompt') {
      return {
        ...definition,
        available: isWindows,
        command: isWindows ? 'cmd.exe' : null,
        args: [],
        unavailableReason: isWindows ? null : 'Command Prompt is only available on Windows hosts.',
      };
    }

    if (definition.type === 'bash') {
      return {
        ...definition,
        available: !isWindows,
        command: !isWindows ? 'bash' : null,
        args: !isWindows ? ['--login', '-i'] : [],
        unavailableReason: !isWindows ? null : 'Use Git Bash or WSL for Linux-style shells on Windows.',
      };
    }

    return {
      ...definition,
      available: false,
      command: null,
      args: [],
      unavailableReason: 'Shell detection requires the native CopilotHub runtime.',
    };
  });
}

function normalizeCatalogEntry(
  shellType: SessionShellType,
  partial: Partial<TerminalShellCatalogEntry> | undefined,
): TerminalShellCatalogEntry {
  const definition = findDefinition(shellType);

  return {
    ...definition,
    available: partial?.available === true,
    command: partial?.command ?? null,
    args: Array.isArray(partial?.args) ? partial.args : [],
    unavailableReason: partial?.unavailableReason ?? null,
  };
}

export function mergeTerminalShellCatalog(
  catalog: Array<Partial<TerminalShellCatalogEntry> & { type: SessionShellType }>,
): TerminalShellCatalogEntry[] {
  return TERMINAL_SHELL_DEFINITIONS.map((definition) =>
    normalizeCatalogEntry(
      definition.type,
      catalog.find((entry) => entry.type === definition.type),
    ),
  );
}

export async function fetchTerminalShellCatalog(): Promise<TerminalShellCatalogEntry[]> {
  try {
    const catalog = await invoke<Array<Partial<TerminalShellCatalogEntry> & { type: SessionShellType }>>(
      'terminal_shell_catalog',
    );

    return mergeTerminalShellCatalog(catalog);
  } catch {
    return createFallbackTerminalShellCatalog();
  }
}

export function resolveTerminalShellSelection(
  preferredShell: SessionShellType,
  catalog: TerminalShellCatalogEntry[],
): ResolvedTerminalShellSelection {
  const requestedShell =
    catalog.find((entry) => entry.type === preferredShell) ??
    normalizeCatalogEntry(preferredShell, undefined);

  if (requestedShell.available && requestedShell.command) {
    return {
      requestedShell,
      activeShell: requestedShell,
      notice: null,
    };
  }

  const fallbackShell = catalog.find((entry) => entry.available && entry.command);

  if (fallbackShell) {
    const detail = requestedShell.unavailableReason
      ? ` ${requestedShell.unavailableReason}`
      : '';

    return {
      requestedShell,
      activeShell: fallbackShell,
      notice: `${requestedShell.label} is unavailable.${detail} Using ${fallbackShell.label} instead.`,
    };
  }

  const detail = requestedShell.unavailableReason
    ? ` ${requestedShell.unavailableReason}`
    : '';

  return {
    requestedShell,
    activeShell: null,
    notice: `No supported terminal shell is available.${detail}`,
  };
}


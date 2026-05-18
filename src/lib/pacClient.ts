// ---------------------------------------------------------------------------
// pacClient.ts -- Power Platform CLI (pac) wrapper.
// Shells out to the locally installed `pac` binary via Tauri shell. Requires
// the user has installed Power Platform CLI:
//   https://learn.microsoft.com/power-platform/developer/cli/introduction
// ---------------------------------------------------------------------------

import { isTauri } from './tauri';

export interface PacResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

const PAC_TIMEOUT_MS = 60_000;

async function runPac(args: string[]): Promise<PacResult> {
  if (!isTauri) {
    return {
      success: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      error: 'Power Platform CLI requires the Tauri runtime.',
    };
  }

  try {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const cmd = Command.create('pac', args);
    const child = cmd as unknown as {
      execute: () => Promise<{ stdout: string; stderr: string; code: number | null }>;
    };

    const output = await Promise.race([
      child.execute(),
      new Promise<{ stdout: string; stderr: string; code: number | null }>((_, reject) =>
        setTimeout(() => reject(new Error(`pac timed out after ${PAC_TIMEOUT_MS / 1000}s`)), PAC_TIMEOUT_MS),
      ),
    ]);

    return {
      success: output.code === 0,
      stdout: output.stdout?.trim() ?? '',
      stderr: output.stderr?.trim() ?? '',
      exitCode: output.code,
      error: output.code === 0 ? undefined : (output.stderr?.trim() || `pac exited with code ${output.code}`),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const installHint = /not allowed|scope|permission/i.test(message)
      ? ' (check Tauri shell ACL configuration)'
      : /ENOENT|not recognized|not found|cannot find/i.test(message)
        ? ' (Power Platform CLI not installed; see https://aka.ms/PowerPlatformCLI)'
        : '';
    return {
      success: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      error: `${message}${installHint}`,
    };
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (/\s/.test(ch)) {
      if (current.length > 0) { tokens.push(current); current = ''; }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

export const pacClient = {
  async run(command: string): Promise<PacResult> {
    const args = tokenize(command);
    return runPac(args);
  },

  async authList(): Promise<PacResult> {
    return runPac(['auth', 'list']);
  },

  async orgList(): Promise<PacResult> {
    return runPac(['org', 'list']);
  },

  async solutionList(): Promise<PacResult> {
    return runPac(['solution', 'list']);
  },

  async dataverseQuery(query: string): Promise<PacResult> {
    // `pac data list-entities` is the closest builtin; richer querying happens
    // via Dataverse Web API. For now, pass through to `pac data` subcommands.
    const args = ['data', ...tokenize(query)];
    return runPac(args);
  },

  async version(): Promise<PacResult> {
    return runPac(['--version']);
  },
};

export default pacClient;

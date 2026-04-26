// ---------------------------------------------------------------------------
// workIqClient.ts -- Work IQ MCP client for CopilotHub
// Wraps the @microsoft/workiq CLI (npx @microsoft/workiq ask) via Tauri shell,
// providing typed query/response access to Microsoft 365 semantic data.
// ---------------------------------------------------------------------------

import { isTauri } from './tauri';

export interface WorkIqQueryOptions {
  tenantId?: string;
  signal?: AbortSignal;
}

export interface WorkIqResponse {
  answer: string;
  sources: WorkIqSource[];
  raw: string;
}

export interface WorkIqSource {
  title: string;
  url: string;
  type: 'email' | 'teams' | 'file' | 'calendar' | 'people' | 'unknown';
}

export type WorkIqStatus = 'idle' | 'querying' | 'ready' | 'error' | 'unavailable';

export interface WorkIqQueryResult {
  success: boolean;
  response: WorkIqResponse | null;
  error: string | null;
}

const WORKIQ_TIMEOUT_MS = 60_000;
const WORKIQ_COMMAND = 'npx';
const WORKIQ_ARGS_BASE = ['-y', '@microsoft/workiq', 'ask', '--question'];

// Parse plain-text workiq CLI output into structured response.
function parseWorkIqOutput(raw: string): WorkIqResponse {
  const sources: WorkIqSource[] = [];

  // Extract markdown-style links: [title](url)
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(raw)) !== null) {
    const url = match[2];
    sources.push({
      title: match[1],
      url,
      type: detectSourceType(url),
    });
  }

  // Strip link references from displayed answer for clean text.
  const answer = raw
    .replace(/\[\d+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { answer, sources, raw };
}

function detectSourceType(url: string): WorkIqSource['type'] {
  if (url.includes('teams.microsoft.com')) return 'teams';
  if (url.includes('outlook.office') || url.includes('mail.office365')) return 'email';
  if (url.includes('sharepoint.com') || url.includes('1drv.ms') || url.includes('onedrive')) return 'file';
  if (url.includes('calendar')) return 'calendar';
  return 'unknown';
}

class WorkIqClient {
  async query(question: string, options: WorkIqQueryOptions = {}): Promise<WorkIqQueryResult> {
    if (!isTauri) {
      // Dev/test environment: return a stub so components can render.
      return {
        success: false,
        response: null,
        error: 'Work IQ requires the Tauri runtime. Run via `tauri dev` or the installed app.',
      };
    }

    try {
      const { Command } = await import('@tauri-apps/plugin-shell');

      const args = [...WORKIQ_ARGS_BASE, question];
      if (options.tenantId) {
        args.unshift('--tenant-id', options.tenantId);
      }

      const cmd = Command.create(WORKIQ_COMMAND, args);

      return await Promise.race([
        this.executeCommand(cmd),
        new Promise<WorkIqQueryResult>((_, reject) =>
          setTimeout(() => reject(new Error(`Work IQ query timed out after ${WORKIQ_TIMEOUT_MS / 1000}s`)), WORKIQ_TIMEOUT_MS),
        ),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, response: null, error: message };
    }
  }

  private async executeCommand(cmd: unknown): Promise<WorkIqQueryResult> {
    // cmd is a ChildProcess from @tauri-apps/plugin-shell
    const child = cmd as {
      execute: () => Promise<{ stdout: string; stderr: string; code: number | null }>;
    };

    const output = await child.execute();

    if (output.code !== 0 && !output.stdout) {
      const errText = output.stderr?.trim() || `Process exited with code ${output.code}`;
      return { success: false, response: null, error: errText };
    }

    const raw = output.stdout.trim();
    if (!raw) {
      return {
        success: false,
        response: null,
        error: 'Work IQ returned an empty response. Check EULA acceptance and authentication.',
      };
    }

    return { success: true, response: parseWorkIqOutput(raw), error: null };
  }
}

const workIqClient = new WorkIqClient();
export default workIqClient;

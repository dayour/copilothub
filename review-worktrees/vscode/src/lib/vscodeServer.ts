import { invoke } from '@tauri-apps/api/core';

import { APP_CONFIG } from './config';
import { isTauri } from './tauri';

export type VsCodeServerLifecycle = 'stopped' | 'starting' | 'running' | 'error';

export interface VsCodeServerStatus {
  lifecycle: VsCodeServerLifecycle;
  trackedPid: number | null;
  localUrl: string;
  healthUrl: string;
  healthy: boolean;
  executableConfigured: boolean;
  lastError: string | null;
}

function createBrowserFallbackStatus(): VsCodeServerStatus {
  return {
    lifecycle: 'stopped',
    trackedPid: null,
    localUrl: APP_CONFIG.vsCodeLocalUrl,
    healthUrl: APP_CONFIG.vsCodeLocalHealthUrl,
    healthy: false,
    executableConfigured: false,
    lastError: null,
  };
}

export async function getVsCodeServerStatus(): Promise<VsCodeServerStatus> {
  if (!isTauri) {
    return createBrowserFallbackStatus();
  }

  return invoke<VsCodeServerStatus>('vscode_server_status');
}

export async function startVsCodeServer(projectPath?: string | null): Promise<VsCodeServerStatus> {
  if (!isTauri) {
    return createBrowserFallbackStatus();
  }

  return invoke<VsCodeServerStatus>('vscode_server_start', { projectPath: projectPath ?? null });
}

export async function stopVsCodeServer(): Promise<VsCodeServerStatus> {
  if (!isTauri) {
    return createBrowserFallbackStatus();
  }

  return invoke<VsCodeServerStatus>('vscode_server_stop');
}

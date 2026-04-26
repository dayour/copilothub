import { invoke } from '@tauri-apps/api/core';

import type { SessionEnvironment } from './sessionEnvironment';
import type { SessionThread } from './sessionThread';
import { isTauri } from './tauri';

export interface StreamableHttpSessionSnapshot {
  sessions: SessionEnvironment[];
  threads: SessionThread[];
  selectedSessionId: string | null;
  selectedThreadId: string | null;
  updatedAtMs: number;
}

export interface StreamableHttpSessionSyncResult {
  sessionCount: number;
  threadCount: number;
  selectedSessionId: string | null;
  selectedThreadId: string | null;
  updatedAtMs: number;
}

function buildFallbackResult(
  snapshot: StreamableHttpSessionSnapshot,
): StreamableHttpSessionSyncResult {
  return {
    sessionCount: snapshot.sessions.length,
    threadCount: snapshot.threads.length,
    selectedSessionId: snapshot.selectedSessionId,
    selectedThreadId: snapshot.selectedThreadId,
    updatedAtMs: snapshot.updatedAtMs,
  };
}

export async function syncStreamableHttpServerSessionContexts(
  snapshot: StreamableHttpSessionSnapshot,
): Promise<StreamableHttpSessionSyncResult> {
  if (!isTauri) {
    return buildFallbackResult(snapshot);
  }

  return invoke<StreamableHttpSessionSyncResult>(
    'sync_streamable_http_server_session_contexts',
    { snapshot },
  );
}

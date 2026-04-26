import { useEffect } from 'react';

import { syncStreamableHttpServerSessionContexts } from '../lib/streamableHttpSessionBridge';
import { useBrowserActionStore } from '../store/browserActionStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';

export function useSessionLinkedTools(): void {
  const sessions = useSessionEnvironmentStore((state) => state.sessions);
  const threads = useSessionEnvironmentStore((state) => state.threads);
  const selectedSessionId = useSessionEnvironmentStore((state) => state.selectedSessionId);
  const selectedThreadId = useSessionEnvironmentStore((state) => state.selectedThreadId);

  useEffect(() => {
    useBrowserActionStore.getState().setSession(selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => {
    void syncStreamableHttpServerSessionContexts({
      sessions,
      threads,
      selectedSessionId,
      selectedThreadId,
      updatedAtMs: Date.now(),
    }).catch(() => {
      // Ignore sync failures until the local streamable server is running.
    });
  }, [selectedSessionId, selectedThreadId, sessions, threads]);
}

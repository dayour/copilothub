import { useEffect } from 'react';
import { useAppStore, type SidecarStatus } from '../store/appStore';
import { eventBridge } from '../lib/eventBridge';
import mcpClient from '../lib/mcpClient';
import { logger } from '../lib/logger';
import { isTauri } from '../lib/tauri';

const VALID_SIDECAR_STATUSES: readonly SidecarStatus[] = ['stopped', 'starting', 'running', 'error'];

export function useSidecar() {
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);

  useEffect(() => {
    if (!isTauri) {
      setSidecarStatus('stopped');
      return undefined;
    }

    let mounted = true;

    async function initSidecar() {
      let sidecarStarted = false;
      try {
        setSidecarStatus('starting');

        // Start the sidecar via Tauri command
        const result = await eventBridge.startSidecar();
        sidecarStarted = true;
        logger.info('sidecar', 'Sidecar started', result);

        // Connect MCP client to the running sidecar
        await mcpClient.connect();

        if (!mounted) {
          mcpClient.disconnect();
          void eventBridge.stopSidecar().catch(() => undefined);
          return;
        }

        setSidecarStatus('running');
        logger.info('sidecar', 'MCP client connected');
      } catch (err) {
        logger.warn('sidecar', 'Sidecar startup failed (expected without binary)', err);
        if (sidecarStarted) {
          void eventBridge
            .stopSidecar()
            .catch((stopError) => logger.debug('sidecar', 'Sidecar stop after startup failure failed', stopError));
        }
        if (mounted) setSidecarStatus('stopped');
      }
    }

    // Listen for sidecar status changes
    eventBridge.onSidecarStatus((status) => {
      if (mounted && VALID_SIDECAR_STATUSES.includes(status as SidecarStatus)) {
        setSidecarStatus(status as SidecarStatus);
      }
    });

    initSidecar();

    return () => {
      mounted = false;
      mcpClient.disconnect();
      void eventBridge.stopSidecar().catch((err) => logger.debug('sidecar', 'Sidecar stop during cleanup failed', err));
    };
  }, [setSidecarStatus]);
}

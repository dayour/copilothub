import { useEffect } from 'react';
import { useAppStore, type SidecarStatus } from '../store/appStore';
import { eventBridge } from '../lib/eventBridge';
import mcpClient from '../lib/mcpClient';
import { logger } from '../lib/logger';

const VALID_SIDECAR_STATUSES: readonly SidecarStatus[] = ['stopped', 'starting', 'running', 'error'];

export function useSidecar() {
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);

  useEffect(() => {
    let mounted = true;

    async function initSidecar() {
      try {
        setSidecarStatus('starting');

        // Start the sidecar via Tauri command
        const result = await eventBridge.startSidecar();
        logger.info('sidecar', 'Sidecar started', result);

        if (!mounted) return;
        setSidecarStatus('running');

        // Connect MCP client to the running sidecar
        await mcpClient.connect();
        logger.info('sidecar', 'MCP client connected');
      } catch (err) {
        logger.warn('sidecar', 'Sidecar startup failed (expected without binary)', err);
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
    };
  }, [setSidecarStatus]);
}

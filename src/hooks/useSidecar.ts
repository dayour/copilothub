import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { eventBridge } from '../lib/eventBridge';
import mcpClient from '../lib/mcpClient';

export function useSidecar() {
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);

  useEffect(() => {
    let mounted = true;

    async function initSidecar() {
      try {
        setSidecarStatus('starting');

        // Start the sidecar via Tauri command
        const result = await eventBridge.startSidecar();
        console.log('[CopilotHub] Sidecar started:', result);

        if (!mounted) return;
        setSidecarStatus('running');

        // Connect MCP client to the running sidecar
        await mcpClient.connect();
        console.log('[CopilotHub] MCP client connected');
      } catch (err) {
        console.warn('[CopilotHub] Sidecar startup failed (expected in dev without sidecar binary):', err);
        if (mounted) setSidecarStatus('stopped');
      }
    }

    // Listen for sidecar status changes
    eventBridge.onSidecarStatus((status) => {
      if (mounted) setSidecarStatus(status as any);
    });

    initSidecar();

    return () => {
      mounted = false;
      mcpClient.disconnect();
    };
  }, [setSidecarStatus]);
}

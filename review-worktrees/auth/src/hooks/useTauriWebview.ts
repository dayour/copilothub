// ---------------------------------------------------------------------------
// useTauriWebview.ts -- Manages a native WebView2 child webview for a tab
// Creates, navigates, resizes, shows/hides, and cleans up a real WebView2
// instance overlaid on the React content area. Falls back to nothing when
// running outside the Tauri shell.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../lib/tauri';

export function useTauriWebview(
  tabId: string,
  url: string,
  isActive: boolean,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const label = `browser-${tabId}`;
  const createdRef = useRef(false);
  const creatingRef = useRef(false);
  const creationTokenRef = useRef(0);
  const disposedRef = useRef(false);
  const lastUrlRef = useRef('');
  const pendingUrlRef = useRef('');
  const isActiveRef = useRef(isActive);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // -- Lifecycle: close the webview only when the hook unmounts -------------
  useEffect(() => {
    if (!isTauri) return;

    disposedRef.current = false;

    return () => {
      disposedRef.current = true;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (createdRef.current || creatingRef.current) {
        creationTokenRef.current += 1;
        invoke('browser_close', { label }).catch(() => {});
      }

      creatingRef.current = false;
      createdRef.current = false;
      pendingUrlRef.current = '';
      lastUrlRef.current = '';
    };
  }, [label]);

  // -- Creation + navigation: create once, reuse on URL changes -------------
  useEffect(() => {
    if (!isTauri) return;

    const hasUrl = url && url !== 'about:blank';
    const container = containerRef.current;

    if (!hasUrl || !container) {
      pendingUrlRef.current = '';

      if (createdRef.current || creatingRef.current) {
        creationTokenRef.current += 1;
        invoke('browser_close', { label }).catch(() => {});
        creatingRef.current = false;
        createdRef.current = false;
        lastUrlRef.current = '';
      }

      return;
    }

    pendingUrlRef.current = url;

    if (createdRef.current) {
      if (url !== lastUrlRef.current) {
        invoke('browser_navigate', { label, url }).catch(console.error);
        lastUrlRef.current = url;
      }

      return;
    }

    if (creatingRef.current) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const initialUrl = url;
    const creationToken = creationTokenRef.current + 1;

    creationTokenRef.current = creationToken;
    creatingRef.current = true;

    invoke('browser_create', {
      label,
      url: initialUrl,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    })
      .then(() => {
        if (disposedRef.current || creationToken !== creationTokenRef.current) {
          invoke('browser_close', { label }).catch(() => {});
          return;
        }

        creatingRef.current = false;
        createdRef.current = true;
        lastUrlRef.current = initialUrl;

        const latestUrl = pendingUrlRef.current;
        if (latestUrl && latestUrl !== initialUrl) {
          invoke('browser_navigate', { label, url: latestUrl }).catch(console.error);
          lastUrlRef.current = latestUrl;
        }

        if (!isActiveRef.current) {
          invoke('browser_hide', { label }).catch(() => {});
        }
      })
      .catch((error) => {
        if (creationToken === creationTokenRef.current) {
          creatingRef.current = false;
        }

        if (!disposedRef.current && creationToken === creationTokenRef.current) {
          console.error(error);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, url]);

  // -- Visibility: show/hide based on active tab ----------------------------
  useEffect(() => {
    if (!isTauri || !createdRef.current) return;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (isActive) {
      // Wait one frame so the container has its correct layout after display toggle
      const frameId = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        invoke('browser_resize', {
          label,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        })
          .then(() => invoke('browser_show', { label }))
          .catch(() => {});
      });

      animationFrameRef.current = frameId;
      return () => {
        if (animationFrameRef.current === frameId) {
          cancelAnimationFrame(frameId);
          animationFrameRef.current = null;
        }
      };
    } else {
      invoke('browser_hide', { label }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // -- Resize tracking: keep webview in sync with container layout ----------
  useEffect(() => {
    if (!isTauri) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (!createdRef.current || !isActive) return;
      const rect = container.getBoundingClientRect();
      invoke('browser_resize', {
        label,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      }).catch(() => {});
    });

    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return { isTauri };
}

// ---------------------------------------------------------------------------
// useTauriWebview.ts -- Manages a native WebView2 child webview for a tab
// Creates, navigates, resizes, shows/hides, and cleans up a real WebView2
// instance overlaid on the React content area. Falls back to nothing when
// running outside the Tauri shell.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '../lib/tauri';
import { useTabStore } from '../store/tabStore';

type BrowserNavigationPayload = {
  label: string;
  url: string;
};

type BrowserLoadingPayload = {
  label: string;
  isLoading: boolean;
  url: string;
};

type BrowserTitlePayload = {
  label: string;
  title: string;
};

export function useTauriWebview(
  tabId: string,
  url: string,
  isActive: boolean,
  containerRef: React.RefObject<HTMLDivElement | null>,
  reloadNonce = 0,
) {
  const label = `browser-${tabId}`;
  const createdRef = useRef(false);
  const creatingRef = useRef(false);
  const creationTokenRef = useRef(0);
  const disposedRef = useRef(false);
  const lastUrlRef = useRef('');
  const pendingUrlRef = useRef('');
  const lastReloadNonceRef = useRef(reloadNonce);
  const isActiveRef = useRef(isActive);
  const animationFrameRef = useRef<number | null>(null);
  const navigationUnlistenRef = useRef<null | (() => void)>(null);
  const loadingUnlistenRef = useRef<null | (() => void)>(null);
  const titleUnlistenRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;
    const syncTabUrlFromHost = useTabStore.getState().syncTabUrlFromHost;

    const setup = async () => {
      const unlisten = await listen<BrowserNavigationPayload>('browser://navigation', (event) => {
        if (cancelled || event.payload.label !== label) return;
        syncTabUrlFromHost(tabId, event.payload.url);
      });

      if (cancelled) {
        unlisten();
        return;
      }

      navigationUnlistenRef.current = unlisten;
    };

    void setup();

    return () => {
      cancelled = true;
      navigationUnlistenRef.current?.();
      navigationUnlistenRef.current = null;
    };
  }, [label, tabId]);

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;

    const setup = async () => {
      const unlisten = await listen<BrowserLoadingPayload>('browser://loading', (event) => {
        if (cancelled || event.payload.label !== label) return;
        const store = useTabStore.getState();
        store.setTabLoading(tabId, event.payload.isLoading);
        store.syncTabUrlFromHost(tabId, event.payload.url);
      });

      if (cancelled) {
        unlisten();
        return;
      }

      loadingUnlistenRef.current = unlisten;
    };

    void setup();

    return () => {
      cancelled = true;
      loadingUnlistenRef.current?.();
      loadingUnlistenRef.current = null;
    };
  }, [label, tabId]);

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;

    const setup = async () => {
      const unlisten = await listen<BrowserTitlePayload>('browser://title', (event) => {
        if (cancelled || event.payload.label !== label) return;
        useTabStore.getState().updateTabTitle(tabId, event.payload.title);
      });

      if (cancelled) {
        unlisten();
        return;
      }

      titleUnlistenRef.current = unlisten;
    };

    void setup();

    return () => {
      cancelled = true;
      titleUnlistenRef.current?.();
      titleUnlistenRef.current = null;
    };
  }, [label, tabId]);

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

      navigationUnlistenRef.current?.();
      navigationUnlistenRef.current = null;
      loadingUnlistenRef.current?.();
      loadingUnlistenRef.current = null;
      titleUnlistenRef.current?.();
      titleUnlistenRef.current = null;

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

  useEffect(() => {
    if (!isTauri) return;
    if (lastReloadNonceRef.current === reloadNonce) return;

    lastReloadNonceRef.current = reloadNonce;

    if (!createdRef.current || !url || url === 'about:blank') return;
    invoke('browser_reload', { label }).catch(console.error);
  }, [label, reloadNonce, url]);

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

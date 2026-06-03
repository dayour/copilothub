import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCw,
  Square,
  Lock,
  Globe,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTabStore } from '../store/tabStore';
import { isMicrosoftPanelTab } from '../lib/microsoftPanels';
import { isTauri } from '../lib/tauri';
import { getSafeExternalHref, normalizeUrlForNavigation } from '../lib/urlSafety';

export function AddressBar() {
  const activeTab = useTabStore((state) => state.activeTab());
  const updateTabUrl = useTabStore((state) => state.updateTabUrl);
  const requestTabReload = useTabStore((state) => state.requestTabReload);
  const navigateBack = useTabStore((state) => state.navigateBack);
  const navigateForward = useTabStore((state) => state.navigateForward);
  const setTabLoading = useTabStore((state) => state.setTabLoading);

  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const showBar = activeTab && (activeTab.type === 'browser' || (isTauri && isMicrosoftPanelTab(activeTab.type)));
  const isNativeManagedTab = !!activeTab && isTauri && (activeTab.type === 'browser' || isMicrosoftPanelTab(activeTab.type));

  useEffect(() => {
    if (!showBar || !activeTab) {
      setInputValue('');
      return;
    }

    if (!isFocused) {
      setInputValue(activeTab.url);
    }
  }, [activeTab, isFocused, showBar]);

  if (!showBar || !activeTab) {
    return null;
  }

  const handleSubmitUrl = () => {
    const nextUrl = normalizeUrlForNavigation(inputValue);
    if (!nextUrl) {
      setInputValue(activeTab.url);
      return;
    }

    updateTabUrl(activeTab.id, nextUrl);
    setInputValue(nextUrl);
    setTabLoading(activeTab.id, true);
  };

  const handleRefreshOrStop = () => {
    if (activeTab.isLoading && isNativeManagedTab) {
      void invoke('browser_stop', { label: `browser-${activeTab.id}` }).catch(() => {});
      setTabLoading(activeTab.id, false);
      return;
    }

    if (!activeTab.url) return;

    if (isNativeManagedTab) {
      setTabLoading(activeTab.id, true);
      void invoke('browser_reload', { label: `browser-${activeTab.id}` })
        .catch(() => {
          setTabLoading(activeTab.id, false);
        });
      return;
    }

    setTabLoading(activeTab.id, true);
    requestTabReload(activeTab.id);
  };

  const isSecure = activeTab.url.startsWith('https://');
  const externalHref = getSafeExternalHref(activeTab.url);

  return (
    <div
      className="flex h-[40px] items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] px-3"
      aria-label="Address bar"
    >
      <button
        type="button"
        onClick={() => {
          if (isNativeManagedTab) {
            void invoke('browser_go_back', { label: `browser-${activeTab.id}` }).catch(() => {});
            return;
          }
          navigateBack(activeTab.id);
        }}
        disabled={!activeTab.canGoBack}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Go back"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => {
          if (isNativeManagedTab) {
            void invoke('browser_go_forward', { label: `browser-${activeTab.id}` }).catch(() => {});
            return;
          }
          navigateForward(activeTab.id);
        }}
        disabled={!activeTab.canGoForward}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        aria-label="Go forward"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleRefreshOrStop}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
        aria-label={activeTab.isLoading ? 'Stop loading' : 'Refresh'}
      >
        {activeTab.isLoading ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <RotateCw className="h-4 w-4" />
        )}
      </button>

      <div className="relative flex min-w-0 flex-1 items-center rounded border border-[var(--color-border-default)] bg-[var(--color-surface-tertiary)]">
        <div className="pointer-events-none absolute left-2 text-[var(--color-text-secondary)]">
          {isSecure ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.currentTarget.value)}
          onFocus={(event) => {
            setIsFocused(true);
            event.currentTarget.select();
          }}
          onBlur={() => {
            setIsFocused(false);
            setInputValue(activeTab.url);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmitUrl();
              event.currentTarget.blur();
              return;
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              setInputValue(activeTab.url);
              event.currentTarget.blur();
            }
          }}
          className="h-8 w-full bg-transparent px-8 pr-3 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Address bar"
        />
      </div>

      {!isTauri && externalHref && (
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          title="Open in external browser"
          aria-label="Open in external browser"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      <div
        className="flex h-7 min-w-[100px] items-center justify-end rounded border border-[var(--color-border-default)] px-2 text-xs text-[var(--color-text-secondary)]"
        aria-label="Extensions area"
      >
        Extensions
      </div>
    </div>
  );
}

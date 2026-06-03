import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bot, ExternalLink, Layers3, LogIn, MonitorSmartphone, Settings2 } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTauriWebview } from '../hooks/useTauriWebview';
import { useAppStore } from '../store/appStore';
import { useTabStore } from '../store/tabStore';
import { APP_CONFIG } from '../lib/config';
import {
  MICROSOFT_PANEL_DEFINITIONS,
  resolveMicrosoftPanelUrl,
  type MicrosoftPanelDestination,
  type MicrosoftPanelTabType,
} from '../lib/microsoftPanels';
import entraAuth from '../lib/entraAuth';

const ENTRA_PLACEHOLDER_CLIENT_ID = '00000000-0000-0000-0000-000000000000';

function StatusChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'neutral' | 'warning' | 'success';
}) {
  const className =
    tone === 'success'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
        : 'border-default bg-surface-primary text-text-secondary';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

interface MicrosoftAppPanelProps {
  tabId: string;
  tabType: MicrosoftPanelTabType;
  url: string;
  isActive: boolean;
}

export function MicrosoftAppPanel({
  tabId,
  tabType,
  url,
  isActive,
}: MicrosoftAppPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const safeUrl = useMemo(() => resolveMicrosoftPanelUrl(tabType, url), [tabType, url]);
  const { isTauri } = useTauriWebview(tabId, safeUrl, isActive, containerRef);
  const updateTabUrl = useTabStore((state) => state.updateTabUrl);
  const openSettingsPanel = useAppStore((state) => state.openSettingsPanel);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const definition = MICROSOFT_PANEL_DEFINITIONS[tabType];
  const isEntraConfigured = APP_CONFIG.entraClientId !== ENTRA_PLACEHOLDER_CLIENT_ID;
  const companionWindowRef = useRef<Window | null>(null);
  const companionWindowName = useMemo(() => `copilothub-${tabType}-${tabId}`, [tabId, tabType]);
  const [isCompanionWindowOpen, setIsCompanionWindowOpen] = useState(false);
  const [wasPopupBlocked, setWasPopupBlocked] = useState(false);

  const authStatus = useMemo(() => {
    if (isAuthenticated) {
      return { label: 'Entra session ready', tone: 'success' as const };
    }

    if (isEntraConfigured) {
      return { label: 'Sign in recommended', tone: 'warning' as const };
    }

    return { label: 'Client ID not configured', tone: 'neutral' as const };
  }, [isAuthenticated, isEntraConfigured]);

  const webviewStatus = isTauri
    ? { label: 'Native WebView2 enabled', tone: 'success' as const }
    : isCompanionWindowOpen
      ? { label: 'Companion window linked', tone: 'success' as const }
      : { label: 'Companion window ready', tone: 'warning' as const };

  const handleNavigate = useCallback((destination: MicrosoftPanelDestination) => {
    updateTabUrl(tabId, destination.url);
    if (!isTauri && companionWindowRef.current && !companionWindowRef.current.closed) {
      try {
        companionWindowRef.current.location.href = destination.url;
        companionWindowRef.current.focus();
      } catch {
        setWasPopupBlocked(true);
      }
    }
  }, [isTauri, tabId, updateTabUrl]);

  const handleOpenExternal = useCallback(() => {
    if (isTauri) {
      void openUrl(safeUrl).catch(() => {});
      return;
    }

    const nextWindow = window.open(
      safeUrl,
      companionWindowName,
      'popup=yes,width=1440,height=960,resizable=yes,scrollbars=yes',
    );
    companionWindowRef.current = nextWindow;
    setWasPopupBlocked(nextWindow === null);
    setIsCompanionWindowOpen(Boolean(nextWindow && !nextWindow.closed));
    nextWindow?.focus();
  }, [companionWindowName, isTauri, safeUrl]);

  const handleFocusCompanionWindow = useCallback(() => {
    const companionWindow = companionWindowRef.current;
    if (!companionWindow || companionWindow.closed) {
      handleOpenExternal();
      return;
    }

    try {
      companionWindow.location.href = safeUrl;
      companionWindow.focus();
      setIsCompanionWindowOpen(true);
    } catch {
      setWasPopupBlocked(true);
    }
  }, [handleOpenExternal, safeUrl]);

  const handleSignIn = useCallback(() => {
    void entraAuth.login().catch(() => {
      openSettingsPanel('integrations');
    });
  }, [openSettingsPanel]);

  useEffect(() => {
    if (isTauri) return;

    const intervalId = window.setInterval(() => {
      const nextIsOpen = Boolean(companionWindowRef.current && !companionWindowRef.current.closed);
      setIsCompanionWindowOpen(nextIsOpen);
      if (nextIsOpen) {
        setWasPopupBlocked(false);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTauri]);

  return (
    <div
      className="flex h-full w-full flex-col bg-surface-primary"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <div className="border-b border-default bg-surface-secondary px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {tabType === 'copilot-studio' ? (
                <Bot size={18} className="text-text-secondary" aria-hidden="true" />
              ) : (
                <Layers3 size={18} className="text-text-secondary" aria-hidden="true" />
              )}
              <h2 className="text-sm font-semibold text-text-primary">{definition.title}</h2>
              <StatusChip tone={webviewStatus.tone}>{webviewStatus.label}</StatusChip>
              <StatusChip tone={authStatus.tone}>{authStatus.label}</StatusChip>
            </div>

            <p className="max-w-3xl text-sm text-text-secondary">{definition.description}</p>

            <div className="flex flex-wrap gap-2">
              {definition.destinations.map((destination) => {
                const isCurrent = safeUrl === destination.url;
                return (
                  <button
                    key={destination.id}
                    type="button"
                    onClick={() => handleNavigate(destination)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      isCurrent
                        ? 'border-[var(--color-border-focus)] bg-[var(--color-accent-primary)]/15 text-text-primary'
                        : 'border-default bg-surface-primary text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    {destination.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isAuthenticated && isEntraConfigured && (
              <button
                type="button"
                onClick={handleSignIn}
                className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-hover"
              >
                <LogIn size={14} />
                <span>Sign in</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openSettingsPanel('integrations')}
              className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-hover"
            >
              <Settings2 size={14} />
              <span>Integrations settings</span>
            </button>
            <button
              type="button"
              onClick={handleOpenExternal}
              className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-surface-hover"
            >
              <ExternalLink size={14} />
              <span>Open externally</span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          <div className="rounded-lg border border-default bg-surface-primary p-3 text-sm text-text-secondary">
            <div className="mb-1 flex items-center gap-2 font-medium text-text-primary">
              <MonitorSmartphone size={15} aria-hidden="true" />
              Native loading guidance
            </div>
            Microsoft 365 maker experiences load best through the Tauri shell because the embedded WebView2 child view avoids iframe restrictions such as CSP and X-Frame-Options.
          </div>
          <div className="rounded-lg border border-default bg-surface-primary p-3 text-sm text-text-secondary">
            <div className="mb-1 font-medium text-text-primary">Authentication note</div>
            CopilotHub currently relies on the existing WebView2 or browser session for these Microsoft pages. Dedicated token injection is not wired yet, so first-run sign-in prompts may still appear inside the destination.
          </div>
        </div>
      </div>

      {isTauri ? (
        <div ref={containerRef} className="min-h-0 flex-1" />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-2xl rounded-xl border border-default bg-surface-secondary p-6">
            <h3 className="text-lg font-semibold text-text-primary">Companion window required for Microsoft maker surfaces</h3>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              The web app keeps this tab as your controller surface, but the actual Microsoft experience runs in a linked companion window because these sites block cross-origin inline embedding. Launch once, then use this tab to switch destinations, relaunch, or recover if the companion window is closed.
            </p>
            {wasPopupBlocked && (
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Your browser blocked the companion window. Allow popups for CopilotHub and launch the Microsoft surface again.
              </p>
            )}
            {!isEntraConfigured && (
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                The configured Entra client ID is still the placeholder value. Update the integration settings before expecting Graph-backed or tenant-aware sign-in flows to succeed.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleOpenExternal}
                className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                <ExternalLink size={14} />
                <span>{isCompanionWindowOpen ? `Relaunch ${definition.title}` : `Launch ${definition.title}`}</span>
              </button>
              <button
                type="button"
                onClick={handleFocusCompanionWindow}
                className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                <ExternalLink size={14} />
                <span>{isCompanionWindowOpen ? 'Focus companion window' : 'Open companion window'}</span>
              </button>
              <button
                type="button"
                onClick={() => openSettingsPanel('integrations')}
                className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                <Settings2 size={14} />
                <span>Open integrations settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

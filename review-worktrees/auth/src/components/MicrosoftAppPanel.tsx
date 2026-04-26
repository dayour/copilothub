import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Bot, ExternalLink, Layers3, LogIn, MonitorSmartphone, Settings2 } from 'lucide-react';
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
    : { label: 'Browser fallback mode', tone: 'warning' as const };

  const handleNavigate = useCallback((destination: MicrosoftPanelDestination) => {
    updateTabUrl(tabId, destination.url);
  }, [tabId, updateTabUrl]);

  const handleOpenExternal = useCallback(() => {
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  }, [safeUrl]);

  const handleSignIn = useCallback(() => {
    void entraAuth.login().catch(() => {
      openSettingsPanel();
    });
  }, [openSettingsPanel]);

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
              onClick={openSettingsPanel}
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
            <h3 className="text-lg font-semibold text-text-primary">Browser fallback is limited for Microsoft maker surfaces</h3>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Standard browser mode cannot reliably embed Copilot Studio, Power Apps, or Power Automate because Microsoft blocks many of these pages from running in cross-origin iframes. Use the Tauri desktop shell for the native panel experience, or open the current destination in a separate browser window.
            </p>
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
                <span>Open {definition.title}</span>
              </button>
              <button
                type="button"
                onClick={openSettingsPanel}
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

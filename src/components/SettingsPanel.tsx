import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  CheckCircle2,
  FolderKanban,
  MonitorCog,
  Palette,
  PlugZap,
  RefreshCw,
  ServerCog,
  Settings2,
  Shield,
  Square,
  UserRound,
  X,
} from 'lucide-react';
import { APP_CONFIG } from '../lib/config';
import entraAuth from '../lib/entraAuth';
import {
  fetchSandboxCatalog,
  prepareSandboxLaunchPlan,
  type SandboxLaunchPlan,
  type SandboxProviderCatalogEntry,
} from '../lib/sandboxIntegration';
import { getVsCodeServerStatus, startVsCodeServer, stopVsCodeServer, type VsCodeServerStatus } from '../lib/vscodeServer';
import {
  fetchTerminalShellCatalog,
  resolveTerminalShellSelection,
  type TerminalShellCatalogEntry,
} from '../lib/terminalShells';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';
import {
  useAppStore,
  type ApprovalPolicy,
  type EditorPreference,
  type SettingsSectionId,
  type Theme,
} from '../store/appStore';
import type { SessionSandboxMode, SessionShellType } from '../lib/sessionEnvironment';

interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: typeof Palette;
}

interface ChoiceOption<TValue extends string> {
  value: TValue;
  label: string;
  description: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Theme, editor defaults, and browsing behavior.',
    icon: Palette,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Entra identity, Graph, and Copilot services.',
    icon: PlugZap,
  },
  {
    id: 'environment',
    label: 'Environment',
    description: 'Workspace, sandbox, shell, and local server status.',
    icon: ServerCog,
  },
];

const THEME_OPTIONS: ChoiceOption<Theme>[] = [
  { value: 'dark', label: 'Edge Dark', description: 'Optimized for long sessions and terminals.' },
  { value: 'light', label: 'Edge Light', description: 'Bright workspace theme for daylight use.' },
  { value: 'enterprise-blue', label: 'Enterprise Blue', description: 'Enterprise styling for presentation workflows.' },
  { value: 'system', label: 'System', description: 'Follow the operating system appearance.' },
];

const EDITOR_OPTIONS: ChoiceOption<EditorPreference>[] = [
  { value: 'vscode', label: 'VS Code workspace', description: 'Prefer the embedded VS Code experience when available.' },
  { value: 'browser', label: 'Browser tab', description: 'Prefer browser-driven workflows and web tabs.' },
];

const SANDBOX_OPTIONS: ChoiceOption<SessionSandboxMode>[] = [
  { value: 'workspace-write', label: 'Workspace write', description: 'Default access limited to the current workspace.' },
  { value: 'full-access', label: 'Full access', description: 'Allow broader machine access for trusted flows.' },
  { value: 'windows-sandbox', label: 'Windows Sandbox', description: 'Isolate tasks inside a disposable Windows sandbox.' },
  { value: 'wsl', label: 'WSL', description: 'Run Linux-oriented tasks inside a WSL environment.' },
];

const APPROVAL_OPTIONS: ChoiceOption<ApprovalPolicy>[] = [
  { value: 'on-request', label: 'On request', description: 'Ask before elevated or risky actions.' },
  { value: 'on-failure', label: 'On failure', description: 'Allow default flow first, then request on escalation.' },
  { value: 'untrusted-only', label: 'Untrusted only', description: 'Only interrupt flows outside trusted workspaces.' },
];

function createInitialVsCodeStatus(): VsCodeServerStatus {
  return {
    lifecycle: 'stopped',
    trackedPid: null,
    localUrl: APP_CONFIG.vsCodeLocalUrl,
    healthUrl: APP_CONFIG.vsCodeLocalHealthUrl,
    healthy: false,
    executableConfigured: false,
    lastError: null,
  };
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  children: string;
}) {
  const toneClassName =
    tone === 'success'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : tone === 'warning'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : tone === 'danger'
          ? 'bg-red-500/15 text-red-300 border-red-500/30'
          : 'bg-surface-tertiary text-text-secondary border-default';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${toneClassName}`}>
      {children}
    </span>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-default bg-surface-secondary/80 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ChoiceGrid<TValue extends string>({
  name,
  legend,
  options,
  selectedValue,
  onChange,
}: {
  name: string;
  legend: string;
  options: ChoiceOption<TValue>[];
  selectedValue: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-medium uppercase tracking-wide text-text-muted">{legend}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                isSelected
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-default bg-surface-primary hover:bg-surface-hover'
              }`}
            >
              <input
                className="mt-1"
                type="radio"
                name={name}
                aria-label={option.label}
                checked={isSelected}
                onChange={() => onChange(option.value)}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">{option.label}</div>
                <div className="mt-1 text-sm text-text-secondary">{option.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SettingsPanel() {
  const settingsPanelOpen = useAppStore((state) => state.settingsPanelOpen);
  const activeSection = useAppStore((state) => state.settingsSelectedSection);
  const closeSettingsPanel = useAppStore((state) => state.closeSettingsPanel);
  const theme = useAppStore((state) => state.theme);
  const defaultEditor = useAppStore((state) => state.defaultEditor);
  const terminalShell = useAppStore((state) => state.terminalShell);
  const verticalTabsEnabled = useAppStore((state) => state.verticalTabsEnabled);
  const browserUseAutoScreenshot = useAppStore((state) => state.browserUseAutoScreenshot);
  const browserUsePersistScreenshots = useAppStore((state) => state.browserUsePersistScreenshots);
  const browserUseMaxSteps = useAppStore((state) => state.browserUseMaxSteps);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const sidecarStatus = useAppStore((state) => state.sidecarStatus);
  const currentProjectPath = useAppStore((state) => state.currentProjectPath);
  const connectedSdkSession = useAppStore((state) => state.connectedSdkSession);
  const sandboxMode = useAppStore((state) => state.sandboxMode);
  const approvalPolicy = useAppStore((state) => state.approvalPolicy);
  const selectedSession = useSessionEnvironmentStore((state) => state.selectedSession());
  const updateSession = useSessionEnvironmentStore((state) => state.updateSession);
  const setTheme = useAppStore((state) => state.setTheme);
  const setDefaultEditor = useAppStore((state) => state.setDefaultEditor);
  const setTerminalShell = useAppStore((state) => state.setTerminalShell);
  const toggleVerticalTabs = useAppStore((state) => state.toggleVerticalTabs);
  const setBrowserUseAutoScreenshot = useAppStore((state) => state.setBrowserUseAutoScreenshot);
  const setBrowserUsePersistScreenshots = useAppStore((state) => state.setBrowserUsePersistScreenshots);
  const setBrowserUseMaxSteps = useAppStore((state) => state.setBrowserUseMaxSteps);
  const setSandboxMode = useAppStore((state) => state.setSandboxMode);
  const setApprovalPolicy = useAppStore((state) => state.setApprovalPolicy);
  const setActiveSection = useAppStore((state) => state.setSettingsSection);

  const [isAuthPending, setIsAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSidecarPending, setIsSidecarPending] = useState(false);
  const [sidecarError, setSidecarError] = useState<string | null>(null);
  const [vsCodeStatus, setVsCodeStatus] = useState<VsCodeServerStatus>(createInitialVsCodeStatus);
  const [vsCodeError, setVsCodeError] = useState<string | null>(null);
  const [isRefreshingVsCode, setIsRefreshingVsCode] = useState(false);
  const [isStartingVsCode, setIsStartingVsCode] = useState(false);
  const [isStoppingVsCode, setIsStoppingVsCode] = useState(false);
  const [shellCatalog, setShellCatalog] = useState<TerminalShellCatalogEntry[]>([]);
  const [isShellCatalogLoading, setIsShellCatalogLoading] = useState(false);
  const [sandboxCatalog, setSandboxCatalog] = useState<SandboxProviderCatalogEntry[]>([]);
  const [isSandboxCatalogLoading, setIsSandboxCatalogLoading] = useState(false);
  const [sandboxPlan, setSandboxPlan] = useState<SandboxLaunchPlan | null>(null);
  const [sandboxPlanError, setSandboxPlanError] = useState<string | null>(null);
  const [isSandboxPlanLoading, setIsSandboxPlanLoading] = useState(false);

  const authState = entraAuth.getState();
  const isEntraConfigured = APP_CONFIG.entraClientId !== '00000000-0000-0000-0000-000000000000';

  const graphStatus = useMemo(() => {
    if (isAuthenticated) {
      return { tone: 'success' as const, label: 'Ready' };
    }

    if (isEntraConfigured) {
      return { tone: 'warning' as const, label: 'Sign-in required' };
    }

    return { tone: 'neutral' as const, label: 'Config placeholder' };
  }, [isAuthenticated, isEntraConfigured]);

  const refreshVsCodeStatus = useCallback(async () => {
    setIsRefreshingVsCode(true);
    setVsCodeError(null);

    try {
      const status = await getVsCodeServerStatus();
      setVsCodeStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVsCodeError(message);
    } finally {
      setIsRefreshingVsCode(false);
    }
  }, []);

  const refreshShellCatalog = useCallback(async () => {
    setIsShellCatalogLoading(true);

    try {
      const catalog = await fetchTerminalShellCatalog();
      setShellCatalog(catalog);
    } finally {
      setIsShellCatalogLoading(false);
    }
  }, []);

  const refreshSandboxCatalog = useCallback(async () => {
    setIsSandboxCatalogLoading(true);

    try {
      const catalog = await fetchSandboxCatalog();
      setSandboxCatalog(catalog);
    } finally {
      setIsSandboxCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!settingsPanelOpen) {
      return undefined;
    }

    void refreshVsCodeStatus();
    void refreshShellCatalog();
    void refreshSandboxCatalog();

    const intervalId = window.setInterval(() => {
      void refreshVsCodeStatus();
    }, 10_000);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSettingsPanel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    closeSettingsPanel,
    refreshSandboxCatalog,
    refreshShellCatalog,
    refreshVsCodeStatus,
    settingsPanelOpen,
  ]);

  const shellSelection = useMemo(
    () => resolveTerminalShellSelection(terminalShell, shellCatalog),
    [shellCatalog, terminalShell],
  );
  const activeSession = selectedSession;
  const activeProjectPath = activeSession?.projectPath ?? currentProjectPath ?? '';
  const activeSandbox = activeSession?.sandbox ?? null;
  const sandboxPlanWarnings = sandboxPlan?.warnings ?? activeSandbox?.warnings ?? [];

  useEffect(() => {
    if (!settingsPanelOpen) {
      return;
    }

    if (!activeProjectPath) {
      setSandboxPlan(null);
      setSandboxPlanError(null);
      setIsSandboxPlanLoading(false);
      return;
    }

    let cancelled = false;
    setIsSandboxPlanLoading(true);
    setSandboxPlanError(null);

    void prepareSandboxLaunchPlan({
      sandboxMode: activeSession?.sandboxMode ?? sandboxMode,
      shellType: activeSession?.shellType ?? terminalShell,
      projectPath: activeProjectPath,
      envVars: activeSession?.envVars,
    })
      .then((plan) => {
        if (cancelled) return;
        setSandboxPlan(plan);
      })
      .catch((error) => {
        if (cancelled) return;
        setSandboxPlan(null);
        setSandboxPlanError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (cancelled) return;
        setIsSandboxPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeProjectPath,
    activeSession,
    sandboxMode,
    settingsPanelOpen,
    terminalShell,
  ]);

  const windowsSandboxProvider = useMemo(
    () => sandboxCatalog.find((entry) => entry.id === 'windows-sandbox') ?? null,
    [sandboxCatalog],
  );
  const wslProvider = useMemo(
    () => sandboxCatalog.find((entry) => entry.id === 'wsl') ?? null,
    [sandboxCatalog],
  );

  const handleTerminalShellChange = useCallback(
    (shell: SessionShellType) => {
      setTerminalShell(shell);
      if (activeSession) {
        updateSession(activeSession.id, { shellType: shell });
      }
    },
    [activeSession, setTerminalShell, updateSession],
  );

  const handleSandboxModeChange = useCallback(
    (mode: SessionSandboxMode) => {
      setSandboxMode(mode);
      if (activeSession) {
        updateSession(activeSession.id, { sandboxMode: mode });
      }
    },
    [activeSession, setSandboxMode, updateSession],
  );

  const handleSignIn = useCallback(async () => {
    setIsAuthPending(true);
    setAuthError(null);

    try {
      await entraAuth.login();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAuthPending(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    setAuthError(null);
    entraAuth.logout();
  }, []);

  const handleStartSidecar = useCallback(async () => {
    setIsSidecarPending(true);
    setSidecarError(null);

    try {
      await invoke('start_sidecar');
    } catch (error) {
      setSidecarError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSidecarPending(false);
    }
  }, []);

  const handleStopSidecar = useCallback(async () => {
    setIsSidecarPending(true);
    setSidecarError(null);

    try {
      await invoke('stop_sidecar');
    } catch (error) {
      setSidecarError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSidecarPending(false);
    }
  }, []);

  const handleStartVsCode = useCallback(async () => {
    setIsStartingVsCode(true);
    setVsCodeError(null);

    try {
      const status = await startVsCodeServer(currentProjectPath);
      setVsCodeStatus(status);
    } catch (error) {
      setVsCodeError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsStartingVsCode(false);
    }
  }, [currentProjectPath]);

  const handleStopVsCode = useCallback(async () => {
    setIsStoppingVsCode(true);
    setVsCodeError(null);

    try {
      const status = await stopVsCodeServer();
      setVsCodeStatus(status);
    } catch (error) {
      setVsCodeError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsStoppingVsCode(false);
    }
  }, []);

  const vsCodeStatusTone =
    vsCodeStatus.healthy
      ? 'success'
      : vsCodeStatus.lifecycle === 'error'
        ? 'danger'
        : vsCodeStatus.executableConfigured
          ? 'warning'
          : 'neutral';

  if (!settingsPanelOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="flex-1 bg-black/40"
        aria-label="Close settings"
        onClick={closeSettingsPanel}
      />

      <div
        className="flex h-full w-full max-w-5xl flex-col border-l border-default bg-surface-primary shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between border-b border-default px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-text-primary">
              <Settings2 size={18} />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Configure the CopilotHub shell, integrations, and local environment.
            </p>
          </div>

          <button
            type="button"
            onClick={closeSettingsPanel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-default bg-surface-secondary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label="Close settings panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="w-72 shrink-0 border-r border-default bg-surface-secondary/60 p-4">
            <nav className="space-y-2" aria-label="Settings sections">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection;

                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-label={section.label}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isActive
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-transparent hover:border-default hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="text-text-secondary" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary">{section.label}</div>
                        <div className="mt-1 text-xs text-text-secondary">{section.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {activeSection === 'general' && (
                <>
                  <SettingsCard
                    title="Appearance"
                    description="Control how CopilotHub looks and how new workspaces open."
                  >
                    <div className="space-y-6">
                      <ChoiceGrid
                        name="theme"
                        legend="Theme"
                        options={THEME_OPTIONS}
                        selectedValue={theme}
                        onChange={setTheme}
                      />

                      <ChoiceGrid
                        name="default-editor"
                        legend="Default editor"
                        options={EDITOR_OPTIONS}
                        selectedValue={defaultEditor}
                        onChange={setDefaultEditor}
                      />
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Terminal and layout"
                    description="Set defaults for terminal sessions and workspace chrome."
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="terminal-shell">
                          Preferred terminal shell
                        </label>
                        <select
                          id="terminal-shell"
                          aria-label="Preferred terminal shell"
                          value={terminalShell}
                          onChange={(event) =>
                            handleTerminalShellChange(event.target.value as SessionShellType)
                          }
                          className="w-full rounded-lg border border-default bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none"
                        >
                          {shellCatalog.map((option) => (
                            <option
                              key={option.type}
                              value={option.type}
                              disabled={!option.available}
                            >
                              {option.available ? option.label : `${option.label} (Unavailable)`}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-sm text-text-secondary">
                          {isShellCatalogLoading
                            ? 'Detecting installed terminal shells for this machine.'
                            : shellSelection.notice ??
                              'Stored now so future terminal tabs and session environments can reuse the same shell default.'}
                        </p>
                        {!isShellCatalogLoading &&
                          !shellSelection.requestedShell.available &&
                          shellSelection.requestedShell.unavailableReason && (
                          <p className="mt-1 text-xs text-text-muted">
                            Availability detail: {shellSelection.requestedShell.unavailableReason}
                          </p>
                        )}
                      </div>

                      <label className="flex items-start gap-3 rounded-lg border border-default bg-surface-primary p-3">
                        <input
                          type="checkbox"
                          checked={verticalTabsEnabled}
                          onChange={() => toggleVerticalTabs()}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-text-primary">Use vertical tab rail</div>
                          <div className="mt-1 text-sm text-text-secondary">
                            Move tabs into the left rail for a Codex-style layout.
                          </div>
                        </div>
                      </label>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Browser automation defaults"
                    description="Adjust defaults reused by Browser Use sessions and command workflows."
                  >
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 rounded-lg border border-default bg-surface-primary p-3">
                        <input
                          type="checkbox"
                          checked={browserUseAutoScreenshot}
                          onChange={(event) => setBrowserUseAutoScreenshot(event.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-text-primary">Capture automatic screenshots</div>
                          <div className="mt-1 text-sm text-text-secondary">
                            Keep visual checkpoints enabled for browser automation runs.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 rounded-lg border border-default bg-surface-primary p-3">
                        <input
                          type="checkbox"
                          checked={browserUsePersistScreenshots}
                          onChange={(event) => setBrowserUsePersistScreenshots(event.target.checked)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-text-primary">Save screenshots to disk</div>
                          <div className="mt-1 text-sm text-text-secondary">
                            Write each captured screenshot to{' '}
                            <code className="rounded bg-surface-secondary px-1 py-0.5 text-xs">
                              %USERPROFILE%\Pictures\Screenshots\CopilotHub\
                            </code>
                            {' '}using the same filename pattern as the Windows Snipping Tool.
                            Recordings persist alongside{' '}
                            <code className="rounded bg-surface-secondary px-1 py-0.5 text-xs">
                              %USERPROFILE%\Videos\CopilotHub\
                            </code>.
                          </div>
                        </div>
                      </label>

                      <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-muted" htmlFor="browser-use-max-steps">
                          Maximum browser steps
                        </label>
                        <input
                          id="browser-use-max-steps"
                          aria-label="Maximum browser steps"
                          type="number"
                          min={1}
                          max={200}
                          value={browserUseMaxSteps}
                          onChange={(event) => setBrowserUseMaxSteps(Number(event.target.value))}
                          className="w-full rounded-lg border border-default bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none"
                        />
                        <p className="mt-2 text-sm text-text-secondary">
                          Values are clamped to a safe range between 1 and 200 steps.
                        </p>
                      </div>
                    </div>
                  </SettingsCard>
                </>
              )}

              {activeSection === 'integrations' && (
                <>
                  <SettingsCard
                    title="Microsoft Entra ID"
                    description="Use the sidecar-backed Entra flow for Graph-aware features and tenant-backed tools."
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusPill tone={isAuthenticated ? 'success' : isEntraConfigured ? 'warning' : 'neutral'}>
                          {isAuthenticated ? 'Signed in' : isEntraConfigured ? 'Ready to sign in' : 'Client ID placeholder'}
                        </StatusPill>
                        <span className="text-sm text-text-secondary">
                          Tenant: {APP_CONFIG.entraTenantId}
                        </span>
                        <span className="text-sm text-text-secondary">
                          Redirect URI: {APP_CONFIG.entraRedirectUri}
                        </span>
                      </div>

                      <div className="rounded-lg border border-default bg-surface-primary p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          <UserRound size={16} />
                          Current identity
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-text-secondary">
                          <div>Name: {authState.userInfo?.name ?? 'Not available'}</div>
                          <div>Email: {authState.userInfo?.email ?? 'Not available'}</div>
                          <div>Object ID: {authState.userInfo?.oid ?? 'Not available'}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            void handleSignIn();
                          }}
                          disabled={isAuthPending || isAuthenticated}
                          className="rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAuthPending ? 'Signing in...' : 'Sign in'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          disabled={isAuthPending || !isAuthenticated}
                          className="rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Sign out
                        </button>
                      </div>

                      {authError && <p className="text-sm text-red-300">{authError}</p>}
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Microsoft Graph"
                    description="Graph capabilities inherit the Entra token and configured scopes from the current app profile."
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusPill tone={graphStatus.tone}>{graphStatus.label}</StatusPill>
                        <span className="text-sm text-text-secondary">
                          Client ID: {APP_CONFIG.entraClientId}
                        </span>
                      </div>

                      <div className="rounded-lg border border-default bg-surface-primary p-4">
                        <div className="mb-2 text-sm font-medium text-text-primary">Configured scopes</div>
                        <ul className="space-y-2 text-sm text-text-secondary">
                          {APP_CONFIG.entraDefaultScopes.map((scope) => (
                            <li key={scope} className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-text-muted" />
                              <span>{scope}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <p className="text-sm text-text-secondary">
                        The Graph sidebar and client wrappers become usable after a successful Entra sign-in. If the
                        client ID remains the placeholder value, update environment configuration before enabling a real
                        tenant flow.
                      </p>
                    </div>
                  </SettingsCard>
                </>
              )}

              {activeSection === 'environment' && (
                <>
                  <SettingsCard
                    title="Workspace defaults"
                    description="Choose how new project sessions should run inside CopilotHub."
                  >
                    <div className="space-y-6">
                      <div className="rounded-lg border border-default bg-surface-primary p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                          <FolderKanban size={16} />
                          Current workspace
                        </div>
                        <div className="mt-3 text-sm text-text-secondary">
                          {currentProjectPath ?? 'No project selected yet.'}
                        </div>
                        <div className="mt-2 text-sm text-text-secondary">
                          Connected SDK session: {connectedSdkSession ?? 'None'}
                        </div>
                        <div className="mt-2 text-sm text-text-secondary">
                          Active session: {activeSession?.name ?? 'Using global defaults'}
                        </div>
                      </div>

                      <div className="rounded-lg border border-default bg-surface-primary p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                            <Shield size={16} />
                            Active isolation profile
                          </div>
                          <StatusPill
                            tone={
                              (activeSandbox ?? sandboxPlan)?.executionTarget === 'windows-sandbox'
                                ? 'success'
                                : (activeSandbox ?? sandboxPlan)?.executionTarget === 'wsl'
                                  ? 'warning'
                                  : sandboxMode === 'full-access'
                                    ? 'danger'
                                    : 'neutral'
                            }
                          >
                            {activeSession?.sandboxMode ?? sandboxMode}
                          </StatusPill>
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-text-secondary">
                          <div>Shell: {activeSession?.shellType ?? terminalShell}</div>
                          <div>
                            Execution target:{' '}
                            {(activeSandbox ?? sandboxPlan)?.executionTarget ?? 'host'}
                          </div>
                          <div>
                            {(sandboxPlan ?? activeSandbox)?.summary ??
                              'No sandbox summary is available for the current selection.'}
                          </div>
                        </div>
                        {sandboxPlanWarnings.length > 0 && (
                          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                            {sandboxPlanWarnings.map((warning) => (
                              <li key={warning} className="flex items-start gap-2">
                                <Shield size={14} className="mt-0.5 shrink-0 text-text-muted" />
                                <span>{warning}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {sandboxPlanError && (
                          <p className="mt-3 text-sm text-red-300">{sandboxPlanError}</p>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {[windowsSandboxProvider, wslProvider].map((provider) => (
                          <div
                            key={provider?.id ?? 'unknown'}
                            className="rounded-lg border border-default bg-surface-primary p-4"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-sm font-medium text-text-primary">
                                {provider?.label ?? 'Sandbox provider'}
                              </div>
                              <StatusPill
                                tone={
                                  !provider
                                    ? 'neutral'
                                    : provider.available
                                      ? 'success'
                                      : 'warning'
                                }
                              >
                                {isSandboxCatalogLoading
                                  ? 'checking'
                                  : provider?.available
                                    ? 'available'
                                    : 'unavailable'}
                              </StatusPill>
                            </div>
                            <p className="mt-3 text-sm text-text-secondary">
                              {provider?.summary ?? 'Provider metadata is unavailable.'}
                            </p>
                            <p className="mt-2 text-sm text-text-secondary">
                              Command: {provider?.command ?? 'Not detected'}
                            </p>
                            {!provider?.available && provider?.unavailableReason && (
                              <p className="mt-2 text-sm text-text-secondary">
                                {provider.unavailableReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <ChoiceGrid
                        name="sandbox-mode"
                        legend="Sandbox mode"
                        options={SANDBOX_OPTIONS}
                        selectedValue={sandboxMode}
                        onChange={handleSandboxModeChange}
                      />

                      <ChoiceGrid
                        name="approval-policy"
                        legend="Approval policy"
                        options={APPROVAL_OPTIONS}
                        selectedValue={approvalPolicy}
                        onChange={setApprovalPolicy}
                      />

                      <div className="rounded-lg border border-default bg-surface-primary p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-sm font-medium text-text-primary">
                            Launch preparation
                          </div>
                          <StatusPill
                            tone={
                              isSandboxPlanLoading
                                ? 'warning'
                                : sandboxPlan?.available
                                  ? 'success'
                                  : 'neutral'
                            }
                          >
                            {isSandboxPlanLoading
                              ? 'preparing'
                              : sandboxPlan?.available
                                ? 'ready'
                                : 'not ready'}
                          </StatusPill>
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-text-secondary">
                          <div>
                            Working directory:{' '}
                            {(sandboxPlan?.workingDirectory ?? activeProjectPath) || 'None'}
                          </div>
                          <div>Launcher: {sandboxPlan?.launcherCommand ?? 'Host execution only'}</div>
                          {sandboxPlan?.launcherArgs.length ? (
                            <div>Arguments: {sandboxPlan.launcherArgs.join(' ')}</div>
                          ) : null}
                          {sandboxPlan?.configPath ? (
                            <div>Config file: {sandboxPlan.configPath}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    title="Local services"
                    description="Inspect the embedded sidecar and VS Code local host wiring."
                  >
                    <div className="space-y-6">
                      <div className="rounded-lg border border-default bg-surface-primary p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                            <MonitorCog size={16} />
                            Automation sidecar
                          </div>
                          <StatusPill
                            tone={
                              sidecarStatus === 'running'
                                ? 'success'
                                : sidecarStatus === 'error'
                                  ? 'danger'
                                  : sidecarStatus === 'starting'
                                    ? 'warning'
                                    : 'neutral'
                            }
                          >
                            {sidecarStatus}
                          </StatusPill>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              void handleStartSidecar();
                            }}
                            disabled={isSidecarPending}
                            className="rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSidecarPending && sidecarStatus !== 'running' ? 'Starting...' : 'Start sidecar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleStopSidecar();
                            }}
                            disabled={isSidecarPending}
                            className="rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSidecarPending && sidecarStatus === 'running' ? 'Stopping...' : 'Stop sidecar'}
                          </button>
                        </div>

                        {sidecarError && <p className="mt-3 text-sm text-red-300">{sidecarError}</p>}
                      </div>

                      <div className="rounded-lg border border-default bg-surface-primary p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                            <Shield size={16} />
                            VS Code local host
                          </div>
                          <StatusPill tone={vsCodeStatusTone}>
                            {vsCodeStatus.healthy ? 'Healthy' : vsCodeStatus.lifecycle}
                          </StatusPill>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-text-secondary">
                          <div>Local URL: {vsCodeStatus.localUrl}</div>
                          <div>Health URL: {vsCodeStatus.healthUrl}</div>
                          <div>Tracked PID: {vsCodeStatus.trackedPid ?? 'Not running'}</div>
                          <div>
                            Executable configured: {vsCodeStatus.executableConfigured ? 'Yes' : 'No'}
                          </div>
                        </div>

                        {!vsCodeStatus.executableConfigured && (
                          <p className="mt-3 text-sm text-text-secondary">
                            Configure VITE_COPILOTHUB_VSCODE_SERVER_URL, VITE_COPILOTHUB_VSCODE_SERVER_HEALTH_URL, and
                            COPILOTHUB_VSCODE_SERVER_COMMAND to enable local extension hosting.
                          </p>
                        )}

                        {(vsCodeError || vsCodeStatus.lastError) && (
                          <p className="mt-3 text-sm text-red-300">{vsCodeError ?? vsCodeStatus.lastError}</p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              void refreshVsCodeStatus();
                            }}
                            disabled={isRefreshingVsCode}
                            className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RefreshCw size={14} className={isRefreshingVsCode ? 'animate-spin' : ''} />
                            Refresh
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleStartVsCode();
                            }}
                            disabled={isStartingVsCode || !vsCodeStatus.executableConfigured}
                            className="rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isStartingVsCode ? 'Starting local server...' : 'Start local server'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleStopVsCode();
                            }}
                            disabled={isStoppingVsCode}
                            className="inline-flex items-center gap-2 rounded-md border border-default bg-surface-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Square size={14} />
                            {isStoppingVsCode ? 'Stopping...' : 'Stop local server'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </SettingsCard>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

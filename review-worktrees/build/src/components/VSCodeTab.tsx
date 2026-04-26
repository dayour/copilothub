// ---------------------------------------------------------------------------
// VSCodeTab.tsx -- Local-first VS Code workbench surface
// Prefers a local VS Code Web host (for example code-server) inside a native
// Tauri child webview, while retaining vscode.dev as a graceful fallback.
// ---------------------------------------------------------------------------

import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_CONFIG } from '../lib/config';
import { isTauri as isNativeTauri } from '../lib/tauri';
import {
  filterVsCodeExtensions,
  formatVsCodeExtensionContributionSummary,
  getVsCodeExtensionRuntimeSummary,
  type VsCodeExtensionSummaryTone,
} from '../lib/vscodeExtensionManagement';
import { buildVsCodeWorkbenchUrl, resolveVsCodeConnectionMode } from '../lib/vscode';
import {
  getVsCodeExtensionHostStatus,
  listVsCodeExtensions,
  type VsCodeExtensionDiscoveryResult,
  type VsCodeExtensionHostStatus,
  type VsCodeLocalExtension,
} from '../lib/vscodeExtensions';
import { getVsCodeServerStatus, startVsCodeServer, type VsCodeServerStatus } from '../lib/vscodeServer';
import { useTauriWebview } from '../hooks/useTauriWebview';
import { useAppStore } from '../store/appStore';

interface VSCodeTabProps {
  tabId: string;
  isActive: boolean;
}

function createInitialServerStatus(): VsCodeServerStatus {
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

const STATUS_POLL_INTERVAL_MS = 5000;

function createInitialExtensionHostStatus(): VsCodeExtensionHostStatus {
  return {
    readiness: 'unavailable',
    hostApiAvailable: false,
    canExecuteExtensions: false,
    executionStage: 'metadata-only',
    extensionDirectory: null,
    extensionDirectoryExists: false,
    discoveredExtensionCount: 0,
    invalidEntryCount: 0,
    localServerHealthy: false,
    executableConfigured: false,
    summary: 'Select a local project to scan .copilothub/extensions.',
    lastError: null,
    remainingGaps: [],
  };
}

function createInitialExtensionDiscovery(): VsCodeExtensionDiscoveryResult {
  return {
    loadContract: {
      discoveryMode: 'directory',
      manifestFileName: 'package.json',
      executionStage: 'metadata-only',
      supportsRuntimeExecution: false,
      configuredExtensionDirectory: null,
    },
    extensionDirectory: null,
    extensionDirectoryExists: false,
    extensions: [],
    invalidEntries: [],
  };
}

function formatExtensionHostReadiness(readiness: VsCodeExtensionHostStatus['readiness']): string {
  switch (readiness) {
    case 'host-ready':
      return 'Host ready';
    case 'discovery-ready':
      return 'Discovery ready';
    default:
      return 'Unavailable';
  }
}

function getExtensionLabel(extension: VsCodeLocalExtension): string {
  return extension.displayName?.trim() || extension.id || extension.name;
}

function getSummaryToneClasses(tone: VsCodeExtensionSummaryTone): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
    case 'warning':
      return 'border-amber-400/25 bg-amber-500/10 text-amber-200';
    case 'danger':
      return 'border-red-400/25 bg-red-500/10 text-red-200';
    default:
      return 'border-white/10 bg-white/5 text-text-secondary';
  }
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'None declared';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-sm">
      <div className="text-text-secondary">{label}</div>
      <div className="break-all text-text-primary">{value}</div>
    </div>
  );
}

export function VSCodeTab({ tabId, isActive }: VSCodeTabProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoStartAttemptedRef = useRef(false);
  const currentProjectPath = useAppStore((state) => state.currentProjectPath);
  const [serverStatus, setServerStatus] = useState<VsCodeServerStatus>(createInitialServerStatus);
  const [isStarting, setIsStarting] = useState(false);
  const [extensionHostStatus, setExtensionHostStatus] = useState<VsCodeExtensionHostStatus>(
    createInitialExtensionHostStatus,
  );
  const [extensionDiscovery, setExtensionDiscovery] = useState<VsCodeExtensionDiscoveryResult>(
    createInitialExtensionDiscovery,
  );
  const [isRefreshingExtensions, setIsRefreshingExtensions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null);
  const [folderActionError, setFolderActionError] = useState<string | null>(null);

  const refreshServerStatus = useCallback(async () => {
    try {
      const status = await getVsCodeServerStatus();
      setServerStatus(status);
    } catch (error) {
      setServerStatus((previous) => ({
        ...previous,
        lifecycle: 'error',
        lastError: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  const handleStartLocalServer = useCallback(async () => {
    setIsStarting(true);

    try {
      const status = await startVsCodeServer(currentProjectPath);
      setServerStatus(status);
    } catch (error) {
      setServerStatus((previous) => ({
        ...previous,
        lifecycle: 'error',
        lastError: error instanceof Error ? error.message : String(error),
      }));
      await refreshServerStatus();
    } finally {
      setIsStarting(false);
    }
  }, [currentProjectPath, refreshServerStatus]);

  const refreshExtensionHostStatus = useCallback(async () => {
    try {
      const status = await getVsCodeExtensionHostStatus(currentProjectPath);
      setExtensionHostStatus(status);
    } catch (error) {
      setExtensionHostStatus((previous) => ({
        ...previous,
        readiness: 'unavailable',
        summary: 'Failed to refresh extension host readiness.',
        lastError: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [currentProjectPath]);

  const refreshExtensionDiscovery = useCallback(async () => {
    try {
      const discovery = await listVsCodeExtensions(currentProjectPath);
      setExtensionDiscovery(discovery);
    } catch (error) {
      setExtensionDiscovery((previous) => ({
        ...previous,
        invalidEntries: [
          {
            path: previous.extensionDirectory ?? currentProjectPath ?? '.copilothub/extensions',
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      }));
    }
  }, [currentProjectPath]);

  const handleRefreshExtensions = useCallback(async () => {
    setIsRefreshingExtensions(true);
    setFolderActionError(null);

    try {
      await Promise.all([refreshExtensionHostStatus(), refreshExtensionDiscovery()]);
    } finally {
      setIsRefreshingExtensions(false);
    }
  }, [refreshExtensionDiscovery, refreshExtensionHostStatus]);

  useEffect(() => {
    void refreshServerStatus();
    void refreshExtensionHostStatus();
    void refreshExtensionDiscovery();

    const intervalId = window.setInterval(() => {
      void refreshServerStatus();
      void refreshExtensionHostStatus();
    }, STATUS_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshExtensionDiscovery, refreshExtensionHostStatus, refreshServerStatus]);

  useEffect(() => {
    if (
      autoStartAttemptedRef.current ||
      !APP_CONFIG.vsCodeLocalAutoStart ||
      serverStatus.healthy ||
      !serverStatus.executableConfigured
    ) {
      return;
    }

    autoStartAttemptedRef.current = true;
    void handleStartLocalServer();
  }, [
    handleStartLocalServer,
    serverStatus.executableConfigured,
    serverStatus.healthy,
  ]);

  const localWorkbenchUrl = useMemo(
    () => buildVsCodeWorkbenchUrl(serverStatus.localUrl || APP_CONFIG.vsCodeLocalUrl, currentProjectPath),
    [currentProjectPath, serverStatus.localUrl],
  );
  const effectiveUrl = serverStatus.healthy ? localWorkbenchUrl : APP_CONFIG.vsCodeUrl;
  const connectionMode = resolveVsCodeConnectionMode(serverStatus.healthy);
  const { isTauri } = useTauriWebview(`vscode-${tabId}`, effectiveUrl, isActive, containerRef);
  const extensionDirectoryPath =
    extensionHostStatus.extensionDirectory ??
    extensionDiscovery.extensionDirectory ??
    extensionDiscovery.loadContract.configuredExtensionDirectory;
  const extensionDirectoryExists =
    extensionHostStatus.extensionDirectoryExists || extensionDiscovery.extensionDirectoryExists;
  const filteredExtensions = useMemo(
    () => filterVsCodeExtensions(extensionDiscovery.extensions, searchQuery),
    [extensionDiscovery.extensions, searchQuery],
  );
  const selectedExtension = useMemo(() => {
    if (filteredExtensions.length === 0) {
      return null;
    }

    return (
      filteredExtensions.find((extension) => extension.id === selectedExtensionId) ??
      filteredExtensions[0]
    );
  }, [filteredExtensions, selectedExtensionId]);
  const selectedExtensionSummary = selectedExtension
    ? getVsCodeExtensionRuntimeSummary(selectedExtension, extensionHostStatus)
    : null;

  const handlePathActionError = useCallback((error: unknown, fallback: string) => {
    setFolderActionError(error instanceof Error ? error.message : fallback);
  }, []);

  const handleOpenExtensionDirectory = useCallback(async () => {
    if (!extensionDirectoryPath) {
      setFolderActionError('Select a local workspace first so CopilotHub can resolve the extension directory.');
      return;
    }

    if (!isNativeTauri) {
      setFolderActionError('Opening local folders is only available inside the CopilotHub Tauri shell.');
      return;
    }

    if (!extensionDirectoryExists) {
      setFolderActionError(`Create ${extensionDirectoryPath} first, then refresh extension discovery.`);
      return;
    }

    setFolderActionError(null);

    try {
      await openPath(extensionDirectoryPath);
    } catch (error) {
      handlePathActionError(error, 'Failed to open the configured extension directory.');
    }
  }, [extensionDirectoryExists, extensionDirectoryPath, handlePathActionError]);

  const handleRevealSelectedExtension = useCallback(async () => {
    if (!selectedExtension) {
      setFolderActionError('Select an extension first to reveal it in the local folder.');
      return;
    }

    if (!isNativeTauri) {
      setFolderActionError('Revealing local files is only available inside the CopilotHub Tauri shell.');
      return;
    }

    setFolderActionError(null);

    try {
      await revealItemInDir(selectedExtension.path);
    } catch (error) {
      handlePathActionError(error, 'Failed to reveal the selected extension.');
    }
  }, [handlePathActionError, selectedExtension]);

  const handleOpenSelectedManifest = useCallback(async () => {
    if (!selectedExtension) {
      setFolderActionError('Select an extension first to open its manifest.');
      return;
    }

    if (!isNativeTauri) {
      setFolderActionError('Opening local files is only available inside the CopilotHub Tauri shell.');
      return;
    }

    setFolderActionError(null);

    try {
      await openPath(selectedExtension.manifestPath);
    } catch (error) {
      handlePathActionError(error, 'Failed to open the selected extension manifest.');
    }
  }, [handlePathActionError, selectedExtension]);

  const handleOpenSelectedReadme = useCallback(async () => {
    if (!selectedExtension?.readmePath) {
      setFolderActionError('The selected extension does not expose a README file.');
      return;
    }

    if (!isNativeTauri) {
      setFolderActionError('Opening local files is only available inside the CopilotHub Tauri shell.');
      return;
    }

    setFolderActionError(null);

    try {
      await openPath(selectedExtension.readmePath);
    } catch (error) {
      handlePathActionError(error, 'Failed to open the selected extension README.');
    }
  }, [handlePathActionError, selectedExtension]);

  useEffect(() => {
    if (isActive && iframeRef.current && !isTauri) {
      iframeRef.current.focus();
    }
  }, [isActive, isTauri]);

  return (
    <div
      className="w-full h-full flex flex-col bg-surface-primary"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-surface-secondary px-4 py-3 text-sm">
        <div className="min-w-0">
          <div className="font-medium text-text-primary">
            {connectionMode === 'local-server' ? 'Local VS Code server active' : 'VS Code remote fallback active'}
          </div>
          <div className="truncate text-text-secondary">
            {connectionMode === 'local-server'
              ? `${localWorkbenchUrl}${serverStatus.trackedPid ? ` (PID ${serverStatus.trackedPid})` : ''}`
              : `Using ${APP_CONFIG.vsCodeUrl} while local server is unavailable.`}
          </div>
          <div className="truncate text-xs text-text-secondary/80">
            {currentProjectPath
              ? `Workspace: ${currentProjectPath}`
              : 'Select a project folder to route a local VS Code server into a workspace.'}
          </div>
          {serverStatus.lastError && connectionMode !== 'local-server' && (
            <div className="truncate text-xs text-red-300">
              Local server status: {serverStatus.lastError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!serverStatus.healthy && serverStatus.executableConfigured && (
            <button
              type="button"
              onClick={() => {
                void handleStartLocalServer();
              }}
              disabled={isStarting}
              className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? 'Starting local server...' : 'Start local server'}
            </button>
          )}

          {!serverStatus.healthy && !serverStatus.executableConfigured && (
            <div className="max-w-xs text-right text-xs text-text-secondary">
              Configure a local host with VITE_COPILOTHUB_VSCODE_SERVER_URL and
              COPILOTHUB_VSCODE_SERVER_COMMAND to enable local extension hosting.
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[420px] shrink-0 flex-col border-r border-white/10 bg-surface-secondary/40">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="rounded-xl border border-white/10 bg-surface-primary/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-text-primary">VS Code extensions</div>
                  <p className="mt-1 text-sm text-text-secondary">
                    Manage unpacked local extensions discovered through the CopilotHub extension bridge.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-text-secondary">
                  {formatExtensionHostReadiness(extensionHostStatus.readiness)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-text-secondary">Discovered</div>
                  <div className="mt-1 text-lg font-semibold text-text-primary">
                    {extensionHostStatus.discoveredExtensionCount}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-text-secondary">Invalid entries</div>
                  <div className="mt-1 text-lg font-semibold text-text-primary">
                    {extensionHostStatus.invalidEntryCount}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-text-secondary">Execution stage</div>
                  <div className="mt-1 font-medium text-text-primary">
                    {extensionHostStatus.executionStage === 'metadata-only'
                      ? 'Metadata discovery'
                      : 'Runtime execution'}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-text-secondary">Install surface</div>
                  <div className="mt-1 font-medium text-text-primary">
                    {extensionDiscovery.loadContract.supportsRuntimeExecution ? 'Bridge-enabled' : 'Local folders only'}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleRefreshExtensions();
                  }}
                  disabled={isRefreshingExtensions}
                  className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshingExtensions ? 'Refreshing extensions...' : 'Refresh extensions'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleOpenExtensionDirectory();
                  }}
                  className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Open extension folder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleRevealSelectedExtension();
                  }}
                  disabled={!selectedExtension}
                  className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reveal selected extension
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                <div className="font-medium">Marketplace installs are not supported yet.</div>
                <p className="mt-1">
                  CopilotHub currently discovers unpacked extensions from the configured local folder and shows staged
                  bridge state instead of faking install or enable actions.
                </p>
              </div>

              <div className="mt-4 text-xs text-text-secondary">
                Directory:{' '}
                <span className="break-all text-text-primary">
                  {extensionDirectoryPath ?? 'Select a local workspace to resolve .copilothub/extensions'}
                </span>
                {extensionDirectoryPath && !extensionDirectoryExists && ' (not created yet)'}
              </div>

              {folderActionError && (
                <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
                  {folderActionError}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-surface-primary/70 p-4">
              <label
                htmlFor={`vscode-extension-search-${tabId}`}
                className="block text-xs font-medium uppercase tracking-wide text-text-muted"
              >
                Search local extensions
              </label>
              <input
                id={`vscode-extension-search-${tabId}`}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, publisher, category, keyword, or path"
                className="mt-2 w-full rounded-lg border border-white/10 bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary/60"
              />
              <p className="mt-2 text-xs text-text-secondary">
                Search only covers extensions already discovered through the local bridge. Remote marketplace search is
                intentionally unsupported for now.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-surface-primary/70 p-4">
              <div className="text-sm font-medium text-text-primary">How to add local extensions</div>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-text-secondary">
                <li>Select or open a local workspace in CopilotHub.</li>
                <li>Place unpacked extension folders with package.json manifests into the configured extension folder.</li>
                <li>Click Refresh extensions to rescan bridge metadata and staged runtime details.</li>
                <li>Use the VS Code workbench on the right for editing while CopilotHub keeps extension management visible.</li>
              </ol>
            </div>

            <div className="space-y-2">
              {filteredExtensions.length > 0 ? (
                filteredExtensions.map((extension) => {
                  const runtimeSummary = getVsCodeExtensionRuntimeSummary(extension, extensionHostStatus);
                  const isSelected = selectedExtension?.id === extension.id;

                  return (
                    <button
                      key={extension.id}
                      type="button"
                      onClick={() => {
                        setSelectedExtensionId(extension.id);
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-accent-primary bg-accent-primary/10'
                          : 'border-white/10 bg-surface-primary/70 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-text-primary">
                            {getExtensionLabel(extension)}
                          </div>
                          <div className="mt-1 text-xs text-text-secondary">
                            {extension.publisher ?? 'Unknown publisher'} . {extension.version}
                          </div>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-medium ${getSummaryToneClasses(runtimeSummary.tone)}`}
                        >
                          {runtimeSummary.label}
                        </span>
                      </div>

                      {extension.description && (
                        <p className="mt-3 line-clamp-3 text-sm text-text-secondary">{extension.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          {formatVsCodeExtensionContributionSummary(extension)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          {extension.activationEvents.length} activation events
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          {extension.extensionKind.length > 0
                            ? extension.extensionKind.join(', ')
                            : 'Kind not declared'}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-surface-primary/50 p-4 text-sm text-text-secondary">
                  {extensionDiscovery.extensions.length === 0
                    ? 'No unpacked extensions have been discovered yet.'
                    : 'No discovered extensions match the current search.'}
                </div>
              )}
            </div>

            {selectedExtension && selectedExtensionSummary && (
              <div className="rounded-xl border border-white/10 bg-surface-primary/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-text-primary">
                      {getExtensionLabel(selectedExtension)}
                    </div>
                    <div className="mt-1 text-sm text-text-secondary">{selectedExtension.id}</div>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-medium ${getSummaryToneClasses(selectedExtensionSummary.tone)}`}
                  >
                    {selectedExtensionSummary.label}
                  </span>
                </div>

                <p className="mt-3 text-sm text-text-secondary">{selectedExtensionSummary.description}</p>

                <div className="mt-4 space-y-3">
                  <DetailRow label="Publisher" value={selectedExtension.publisher ?? 'Unknown'} />
                  <DetailRow label="Version" value={selectedExtension.version} />
                  <DetailRow label="Kinds" value={formatList(selectedExtension.extensionKind)} />
                  <DetailRow label="Categories" value={formatList(selectedExtension.categories)} />
                  <DetailRow label="Keywords" value={formatList(selectedExtension.keywords)} />
                  <DetailRow
                    label="Activation"
                    value={
                      selectedExtension.activationEvents.length > 0
                        ? selectedExtension.activationEvents.join(', ')
                        : 'No activation events declared'
                    }
                  />
                  <DetailRow
                    label="Entry points"
                    value={[
                      selectedExtension.entryPoints.main
                        ? `main: ${selectedExtension.entryPoints.main}`
                        : null,
                      selectedExtension.entryPoints.browser
                        ? `browser: ${selectedExtension.entryPoints.browser}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' | ') || 'No runtime entry point declared'}
                  />
                  <DetailRow label="Path" value={selectedExtension.path} />
                  <DetailRow label="Manifest" value={selectedExtension.manifestPath} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleOpenSelectedManifest();
                    }}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Open selected manifest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleOpenSelectedReadme();
                    }}
                    disabled={!selectedExtension.readmePath}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Open selected README
                  </button>
                </div>

                {selectedExtension.warnings.length > 0 && (
                  <div className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3">
                    <div className="text-sm font-medium text-red-200">Manifest warnings</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-200">
                      {selectedExtension.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {extensionDiscovery.invalidEntries.length > 0 && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                <div className="text-sm font-medium text-red-200">Invalid extension entries</div>
                <ul className="mt-3 space-y-2 text-sm text-red-100">
                  {extensionDiscovery.invalidEntries.map((entry) => (
                    <li key={`${entry.path}:${entry.message}`} className="rounded-lg border border-red-400/10 p-3">
                      <div className="break-all font-medium">{entry.path}</div>
                      <div className="mt-1 text-red-100/90">{entry.message}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {extensionHostStatus.remainingGaps.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-surface-primary/70 p-4">
                <div className="text-sm font-medium text-text-primary">Bridge gaps</div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
                  {extensionHostStatus.remainingGaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <div className="relative flex-1 overflow-hidden">
          {isTauri ? (
            <div ref={containerRef} className="w-full h-full" />
          ) : (
            <iframe
              ref={iframeRef}
              src={effectiveUrl}
              className="w-full h-full border-0"
              title="VS Code"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
              allow="clipboard-read; clipboard-write"
            />
          )}
        </div>
      </div>
    </div>
  );
}

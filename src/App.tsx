// ---------------------------------------------------------------------------
// App.tsx -- CopilotHub main application shell
// Assembles TitleBar, TabBar, AddressBar, and tab content area.
// ---------------------------------------------------------------------------

import { Suspense, lazy, useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { BookOpen, Bot, ExternalLink, GitBranch, Globe, MessageSquare, Terminal } from 'lucide-react';
import { useTabStore } from './store/tabStore';
import { useAppStore } from './store/appStore';
import { useWorkspaceStore } from './store/workspaceStore';
import { TitleBar } from './components/TitleBar';
import { WorkspaceBar } from './components/WorkspaceBar';
import { TabBar } from './components/TabBar';
import { AddressBar } from './components/AddressBar';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatInput } from './components/ChatInput';
import { ChatThreadBar } from './components/ChatThreadBar';
import { TerminalTab } from './components/TerminalTab';
import { NewTabPage } from './components/NewTabPage';
import { MicrosoftAppPanel } from './components/MicrosoftAppPanel';
import { CommandPalette } from './components/CommandPalette';
import { CopilotSidebar } from './components/CopilotSidebar';
import { GitReviewPane } from './components/GitReviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { ProjectSidebar } from './components/ProjectSidebar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEntraAuth } from './hooks/useEntraAuth';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useSessionLinkedTools } from './hooks/useSessionLinkedTools';
import { useSidecar } from './hooks/useSidecar';
import { useTauriWebview } from './hooks/useTauriWebview';
import { isMicrosoftPanelTab } from './lib/microsoftPanels';
import { isTauri } from './lib/tauri';

const BrowserUseTab = lazy(async () => {
  const module = await import('./components/BrowserUseTab');
  return { default: module.BrowserUseTab };
});

const LazyVSCodeTab = lazy(async () => {
  const module = await import('./components/VSCodeTab');
  return { default: module.VSCodeTab };
});

const LazyRunbookMarketplace = lazy(async () => {
  const module = await import('./components/RunbookMarketplace');
  return { default: module.RunbookMarketplace };
});

const CalendarApp = lazy(async () => {
  const module = await import('./components/demos/CalendarApp');
  return { default: module.CalendarApp };
});

const MechanicApp = lazy(async () => {
  const module = await import('./components/demos/MechanicApp');
  return { default: module.MechanicApp };
});

const CoffeeShopApp = lazy(async () => {
  const module = await import('./components/demos/CoffeeShopApp');
  return { default: module.CoffeeShopApp };
});

const AdaptiveCardApp = lazy(async () => {
  const module = await import('./components/demos/AdaptiveCardApp');
  return { default: module.AdaptiveCardApp };
});

const WiringDiagramApp = lazy(async () => {
  const module = await import('./components/demos/WiringDiagramApp');
  return { default: module.WiringDiagramApp };
});

const CopilotStudioGuide = lazy(async () => {
  const module = await import('./components/demos/CopilotStudioGuide');
  return { default: module.CopilotStudioGuide };
});

const MediaAssetStudio = lazy(async () => {
  const module = await import('./components/demos/MediaAssetStudio');
  return { default: module.MediaAssetStudio };
});

const AnimationStudio = lazy(async () => {
  const module = await import('./components/demos/AnimationStudio');
  return { default: module.AnimationStudio };
});

const CoffeeVirtualCoach = lazy(async () => {
  const module = await import('./components/showcases/CoffeeVirtualCoach');
  return { default: module.CoffeeVirtualCoach };
});

const ClothingPowerAnalysis = lazy(async () => {
  const module = await import('./components/showcases/ClothingPowerAnalysis');
  return { default: module.ClothingPowerAnalysis };
});

const InsuranceClaimsAssistant = lazy(async () => {
  const module = await import('./components/showcases/InsuranceClaimsAssistant');
  return { default: module.InsuranceClaimsAssistant };
});

const ITHelpDesk = lazy(async () => {
  const module = await import('./components/showcases/ITHelpDesk');
  return { default: module.ITHelpDesk };
});

const SellerProspect = lazy(async () => {
  const module = await import('./components/showcases/SellerProspect');
  return { default: module.SellerProspect };
});

const FleetCoordinator = lazy(async () => {
  const module = await import('./components/showcases/FleetCoordinator');
  return { default: module.FleetCoordinator };
});

const FuelTracking = lazy(async () => {
  const module = await import('./components/showcases/FuelTracking');
  return { default: module.FuelTracking };
});

const DayourProtocolSlides = lazy(async () => {
  const module = await import('./components/showcases/DayourProtocolSlides');
  return { default: module.DayourProtocolSlides };
});

const CoWorkPanel = lazy(async () => {
  const module = await import('./components/CoWorkPanel');
  return { default: module.CoWorkPanel };
});

function TabContentFallback({
  isActive,
  className,
  display = 'block',
  style,
}: {
  isActive: boolean;
  className: string;
  display?: CSSProperties['display'];
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{ display: isActive ? display : 'none', ...style }}
      aria-busy={isActive || undefined}
    />
  );
}

function LazyTabFrame({
  isActive,
  className,
  display = 'block',
  style,
  children,
}: {
  isActive: boolean;
  className: string;
  display?: CSSProperties['display'];
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={(
        <TabContentFallback
          isActive={isActive}
          className={className}
          display={display}
          style={style}
        />
      )}
    >
      <div className={className} style={{ display: isActive ? display : 'none', ...style }}>
        {children}
      </div>
    </Suspense>
  );
}

function BrowserTabContent({ tab }: { tab: { id: string; url: string; isActive: boolean } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isTauri: tauriMode } = useTauriWebview(tab.id, tab.url, tab.isActive, containerRef);

  const handleIframeLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const store = useTabStore.getState();
    store.setTabLoading(tab.id, false);
    try {
      const title = (e.target as HTMLIFrameElement).contentDocument?.title;
      if (title) store.updateTabTitle(tab.id, title);
    } catch {
      // Cross-origin -- use hostname as fallback title
      try {
        const hostname = new URL(tab.url).hostname;
        if (hostname) store.updateTabTitle(tab.id, hostname);
      } catch { /* invalid URL -- leave title unchanged */ }
    }
  }, [tab.id, tab.url]);

  // New Tab page (no URL yet)
  if (!tab.url || tab.url === 'about:blank') {
    return (
      <div
        className="w-full h-full"
        style={{ display: tab.isActive ? 'block' : 'none' }}
      >
        <NewTabPage tabId={tab.id} />
      </div>
    );
  }

  // Tauri: native WebView2 child webview (managed by useTauriWebview hook)
  if (tauriMode) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ display: tab.isActive ? 'block' : 'none' }}
      />
    );
  }

  // Browser fallback: iframe with "open externally" overlay on hover
  return (
    <div
      className="w-full h-full relative group/browser"
      style={{ display: tab.isActive ? 'block' : 'none' }}
    >
      <iframe
        key={tab.url}
        src={tab.url}
        className="w-full h-full border-0"
        title={`Browser tab ${tab.id}`}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        onLoad={handleIframeLoad}
      />
      <div className="absolute bottom-3 right-3 opacity-0 group-hover/browser:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/browser:pointer-events-auto">
        <a
          href={tab.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md bg-[var(--color-surface-primary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] shadow-lg border border-[var(--color-border-default)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open in browser
        </a>
      </div>
    </div>
  );
}

function ChatTabContent({ isActive }: { isActive: boolean }) {
  return (
    <div
      className="flex flex-col w-full h-full"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      <ChatThreadBar />
      <div className="flex-1 overflow-hidden">
        <ChatMessageList />
      </div>
      <ChatInput />
    </div>
  );
}

function App() {
  useTheme();
  useChat(); // Initialize event bridge listeners
  useEntraAuth();
  useSessionLinkedTools();
  useSidecar();

  const tabs = useTabStore((s) => s.tabs);
  const activeTab = useTabStore((s) => s.activeTab());
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const verticalTabsEnabled = useAppStore((s) => s.verticalTabsEnabled);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const settingsPanelOpen = useAppStore((s) => s.settingsPanelOpen);
  const copilotSidebarOpen = useAppStore((s) => s.copilotSidebarOpen);
  const assistantPaneMode = useAppStore((s) => s.assistantPaneMode);
  const openCopilotPane = useAppStore((s) => s.openCopilotPane);
  const openReviewPane = useAppStore((s) => s.openReviewPane);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const snapshotFlash = useWorkspaceStore((s) => s.snapshotFlash);
  const chatTabId = tabs.find((tab) => tab.type === 'chat')?.id ?? null;

  const handleAddProject = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select project folder',
      });

      if (typeof selected === 'string' && selected.trim().length > 0) {
        setCurrentProject(selected);
      }
    } catch {
      // Ignore picker failures outside Tauri or cancelled selections.
    }
  }, [setCurrentProject]);

  useKeyboardShortcuts(handleAddProject);

  useEffect(() => {
    if (settingsPanelOpen && commandPaletteOpen) {
      useAppStore.getState().toggleCommandPalette();
    }
  }, [commandPaletteOpen, settingsPanelOpen]);

  const handleOpenChatTab = useCallback(() => {
    if (chatTabId) {
      setActiveTab(chatTabId);
      return;
    }

    addTab('chat');
  }, [addTab, chatTabId, setActiveTab]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-primary">
      {/* Titlebar */}
      <TitleBar />

      {/* Workspace switcher strip */}
      <WorkspaceBar />

      {/* Snapshot flash overlay */}
      {snapshotFlash && (
        <div className="pointer-events-none fixed inset-0 z-[200] animate-[snapshot-flash_400ms_ease-out_forwards] bg-white/20" />
      )}

      {/* Main layout: navigation | workspace | assistant */}
      <div className="flex flex-1 overflow-hidden">
        <section
          className="flex h-full shrink-0 min-h-0 bg-surface-secondary/70"
          aria-label="Navigation panel"
        >
          <ProjectSidebar onAddProject={handleAddProject} />

          {/* Vertical tabs sidebar (when enabled) */}
          {verticalTabsEnabled && (
            <div
              className="flex h-full shrink-0 min-h-0 border-r border-border-default bg-surface-primary/30"
              style={{ width: 'var(--spacing-sidebar-width)' }}
            >
              <TabBar vertical />
            </div>
          )}
        </section>

        {/* Main workspace column */}
        <main
          className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border-default bg-surface-primary"
          aria-label="Workspace panel"
        >
          {/* Horizontal tab bar (when not in vertical mode) */}
          {!verticalTabsEnabled && <TabBar />}

          {/* Address bar (browser tabs everywhere, Microsoft tabs in native Tauri mode) */}
          {(activeTab?.type === 'browser' || (isTauri && activeTab && isMicrosoftPanelTab(activeTab.type))) && <AddressBar />}

          {/* Tab content area */}
          <div className="flex-1 overflow-hidden relative">
            {tabs.map((tab) => {
              switch (tab.type) {
                case 'browser':
                  return (
                    <BrowserTabContent
                      key={tab.id}
                      tab={{ id: tab.id, url: tab.url, isActive: tab.isActive }}
                    />
                  );
                case 'browser-use':
                  return (
                    <Suspense key={tab.id} fallback={<TabContentFallback isActive={tab.isActive} className="w-full h-full" />}>
                      <BrowserUseTab isActive={tab.isActive} />
                    </Suspense>
                  );
                case 'copilot-studio':
                case 'power-platform':
                  return (
                    <MicrosoftAppPanel
                      key={tab.id}
                      tabId={tab.id}
                      tabType={tab.type}
                      url={tab.url}
                      isActive={tab.isActive}
                    />
                  );
                case 'chat':
                  return <ChatTabContent key={tab.id} isActive={tab.isActive} />;
                case 'vscode':
                  return (
                    <Suspense key={tab.id} fallback={<TabContentFallback isActive={tab.isActive} className="w-full h-full" />}>
                      <LazyVSCodeTab tabId={tab.id} isActive={tab.isActive} />
                    </Suspense>
                  );
                case 'terminal':
                  return (
                    <div
                      key={tab.id}
                      className="w-full h-full"
                      style={{ display: tab.isActive ? 'block' : 'none' }}
                    >
                      <TerminalTab isActive={tab.isActive} />
                    </div>
                  );
                case 'runbook':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-auto">
                      <LazyRunbookMarketplace />
                    </LazyTabFrame>
                  );
                case 'demo-calendar':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-auto">
                      <CalendarApp />
                    </LazyTabFrame>
                  );
                case 'demo-mechanic':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-auto">
                      <MechanicApp />
                    </LazyTabFrame>
                  );
                case 'demo-coffeeshop':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-auto">
                      <CoffeeShopApp />
                    </LazyTabFrame>
                  );
                case 'demo-adaptive-cards':
                  return (
                    <LazyTabFrame
                      key={tab.id}
                      isActive={tab.isActive}
                      className="w-full h-full overflow-hidden"
                      display="flex"
                      style={{ flexDirection: 'column' }}
                    >
                      <AdaptiveCardApp />
                    </LazyTabFrame>
                  );
                case 'demo-wiring':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <WiringDiagramApp />
                    </LazyTabFrame>
                  );
                case 'demo-studio-guide':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-auto">
                      <CopilotStudioGuide />
                    </LazyTabFrame>
                  );
                case 'demo-media-assets':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <MediaAssetStudio />
                    </LazyTabFrame>
                  );
                case 'demo-animations':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <AnimationStudio />
                    </LazyTabFrame>
                  );
                case 'showcase-coffee':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <CoffeeVirtualCoach />
                    </LazyTabFrame>
                  );
                case 'showcase-clothing':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <ClothingPowerAnalysis />
                    </LazyTabFrame>
                  );
                case 'showcase-insurance':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <InsuranceClaimsAssistant />
                    </LazyTabFrame>
                  );
                case 'showcase-it-helpdesk':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <ITHelpDesk />
                    </LazyTabFrame>
                  );
                case 'showcase-seller':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <SellerProspect />
                    </LazyTabFrame>
                  );
                case 'showcase-fleet':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <FleetCoordinator />
                    </LazyTabFrame>
                  );
                case 'showcase-fuel':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <FuelTracking />
                    </LazyTabFrame>
                  );
                case 'showcase-dayour-protocol':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <DayourProtocolSlides />
                    </LazyTabFrame>
                  );
                case 'cowork':
                  return (
                    <LazyTabFrame key={tab.id} isActive={tab.isActive} className="w-full h-full overflow-hidden">
                      <CoWorkPanel />
                    </LazyTabFrame>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </main>

        <aside
          className="flex h-full shrink-0 min-h-0 bg-surface-secondary/80 transition-[width] duration-200 ease-out"
          style={{ width: copilotSidebarOpen ? 'clamp(280px, 24vw, 360px)' : '48px' }}
          aria-label="Assistant panel"
        >
          {copilotSidebarOpen ? (
            assistantPaneMode === 'review' ? <GitReviewPane /> : <CopilotSidebar />
          ) : (
            <div className="flex h-full w-full flex-col items-center gap-3 border-l border-border-default p-2">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Assist</span>
                <button
                  type="button"
                  onClick={openCopilotPane}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  aria-label="Open Copilot sidebar"
                  title="Open Copilot sidebar"
                >
                  <Bot size={16} />
                </button>
                <button
                  type="button"
                  onClick={openReviewPane}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  aria-label="Open Git review pane"
                  title="Open Git review pane"
                >
                  <GitBranch size={16} />
                </button>
              </div>

              <div className="h-px w-full bg-border-default" />

              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Launch</span>
                <button
                  type="button"
                  onClick={handleOpenChatTab}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  aria-label="Open chat tab"
                  title="Open chat tab"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => addTab('terminal')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  aria-label="Open terminal tab"
                  title="Open terminal tab"
                >
                  <Terminal size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => addTab('browser')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  aria-label="Open browser tab"
                  title="Open browser tab"
                >
                  <Globe size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => addTab('runbook')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  aria-label="Open runbook marketplace"
                  title="Open runbook marketplace"
                >
                  <BookOpen size={16} />
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Command Palette overlay */}
      <CommandPalette />
      <SettingsPanel />
    </div>
  );
}

export default App;

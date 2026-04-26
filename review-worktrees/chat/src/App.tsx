// ---------------------------------------------------------------------------
// App.tsx -- CopilotHub main application shell
// Assembles TitleBar, TabBar, AddressBar, and tab content area.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { GitBranch, MessageSquare } from 'lucide-react';
import { useTabStore } from './store/tabStore';
import { useAppStore } from './store/appStore';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { AddressBar } from './components/AddressBar';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatInput } from './components/ChatInput';
import { ChatThreadBar } from './components/ChatThreadBar';
import { TerminalTab } from './components/TerminalTab';
import { VSCodeTab } from './components/VSCodeTab';
import { NewTabPage } from './components/NewTabPage';
import { CommandPalette } from './components/CommandPalette';
import { CopilotSidebar } from './components/CopilotSidebar';
import { GitReviewPane } from './components/GitReviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { RunbookMarketplace } from './components/RunbookMarketplace';
import { CalendarApp } from './components/demos/CalendarApp';
import { MechanicApp } from './components/demos/MechanicApp';
import { CoffeeShopApp } from './components/demos/CoffeeShopApp';
import { AdaptiveCardApp } from './components/demos/AdaptiveCardApp';
import { WiringDiagramApp } from './components/demos/WiringDiagramApp';
import { CopilotStudioGuide } from './components/demos/CopilotStudioGuide';
import { MediaAssetStudio } from './components/demos/MediaAssetStudio';
import { AnimationStudio } from './components/demos/AnimationStudio';
import { CoffeeVirtualCoach } from './components/showcases/CoffeeVirtualCoach';
import { ClothingPowerAnalysis } from './components/showcases/ClothingPowerAnalysis';
import { InsuranceClaimsAssistant } from './components/showcases/InsuranceClaimsAssistant';
import { ITHelpDesk } from './components/showcases/ITHelpDesk';
import { SellerProspect } from './components/showcases/SellerProspect';
import { FleetCoordinator } from './components/showcases/FleetCoordinator';
import { FuelTracking } from './components/showcases/FuelTracking';
import { DayourProtocolSlides } from './components/showcases/DayourProtocolSlides';
import { BrowserUseTab } from './components/BrowserUseTab';
import { MicrosoftAppPanel } from './components/MicrosoftAppPanel';
import { ProjectSidebar } from './components/ProjectSidebar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEntraAuth } from './hooks/useEntraAuth';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useSessionLinkedTools } from './hooks/useSessionLinkedTools';
import { useSidecar } from './hooks/useSidecar';
import { useTauriWebview } from './hooks/useTauriWebview';

function BrowserTabContent({ tab }: { tab: { id: string; url: string; isActive: boolean } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isTauri } = useTauriWebview(tab.id, tab.url, tab.isActive, containerRef);

  const handleIframeLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const title = (e.target as HTMLIFrameElement).contentDocument?.title;
      if (title) useTabStore.getState().updateTabTitle(tab.id, title);
    } catch {
      // Cross-origin, can't access title
    }
  }, [tab.id]);

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
  if (isTauri) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ display: tab.isActive ? 'block' : 'none' }}
      />
    );
  }

  // Browser fallback: iframe (works for sites that allow framing)
  return (
    <div
      className="w-full h-full"
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
  const verticalTabsEnabled = useAppStore((s) => s.verticalTabsEnabled);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const settingsPanelOpen = useAppStore((s) => s.settingsPanelOpen);
  const copilotSidebarOpen = useAppStore((s) => s.copilotSidebarOpen);
  const assistantPaneMode = useAppStore((s) => s.assistantPaneMode);
  const openCopilotPane = useAppStore((s) => s.openCopilotPane);
  const openReviewPane = useAppStore((s) => s.openReviewPane);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);

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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-primary">
      {/* Titlebar */}
      <TitleBar />

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

          {/* Address bar (only for browser tabs) */}
          {activeTab?.type === 'browser' && <AddressBar />}

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
                  return <BrowserUseTab key={tab.id} isActive={tab.isActive} />;
                case 'copilot-studio':
                  return (
                    <MicrosoftAppPanel
                      key={tab.id}
                      tabId={tab.id}
                      tabType="copilot-studio"
                      url={tab.url}
                      isActive={tab.isActive}
                    />
                  );
                case 'power-platform':
                  return (
                    <MicrosoftAppPanel
                      key={tab.id}
                      tabId={tab.id}
                      tabType="power-platform"
                      url={tab.url}
                      isActive={tab.isActive}
                    />
                  );
                case 'chat':
                  return <ChatTabContent key={tab.id} isActive={tab.isActive} />;
                case 'vscode':
                  return <VSCodeTab key={tab.id} tabId={tab.id} isActive={tab.isActive} />;
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
                    <div key={tab.id} className="w-full h-full overflow-auto" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <RunbookMarketplace />
                    </div>
                  );
                case 'demo-calendar':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-auto" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <CalendarApp />
                    </div>
                  );
                case 'demo-mechanic':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-auto" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <MechanicApp />
                    </div>
                  );
                case 'demo-coffeeshop':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-auto" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <CoffeeShopApp />
                    </div>
                  );
                case 'demo-adaptive-cards':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'flex' : 'none', flexDirection: 'column' }}>
                      <AdaptiveCardApp />
                    </div>
                  );
                case 'demo-wiring':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <WiringDiagramApp />
                    </div>
                  );
                case 'demo-studio-guide':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-auto" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <CopilotStudioGuide />
                    </div>
                  );
                case 'demo-media-assets':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <MediaAssetStudio />
                    </div>
                  );
                case 'demo-animations':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <AnimationStudio />
                    </div>
                  );
                case 'showcase-coffee':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <CoffeeVirtualCoach />
                    </div>
                  );
                case 'showcase-clothing':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <ClothingPowerAnalysis />
                    </div>
                  );
                case 'showcase-insurance':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <InsuranceClaimsAssistant />
                    </div>
                  );
                case 'showcase-it-helpdesk':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <ITHelpDesk />
                    </div>
                  );
                case 'showcase-seller':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <SellerProspect />
                    </div>
                  );
                case 'showcase-fleet':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <FleetCoordinator />
                    </div>
                  );
                case 'showcase-fuel':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <FuelTracking />
                    </div>
                  );
                case 'showcase-dayour-protocol':
                  return (
                    <div key={tab.id} className="w-full h-full overflow-hidden" style={{ display: tab.isActive ? 'block' : 'none' }}>
                      <DayourProtocolSlides />
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </main>

        <aside
          className="flex h-full shrink-0 min-h-0 bg-surface-secondary/80"
          style={{ width: copilotSidebarOpen ? 'clamp(280px, 24vw, 360px)' : '48px' }}
          aria-label="Assistant panel"
        >
          {copilotSidebarOpen ? (
            assistantPaneMode === 'review' ? <GitReviewPane /> : <CopilotSidebar />
          ) : (
            <div className="flex h-full w-full flex-col items-center gap-2 border-l border-border-default p-2">
              <button
                type="button"
                onClick={openCopilotPane}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default bg-surface-tertiary text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                aria-label="Open Copilot sidebar"
                title="Open Copilot sidebar"
              >
                <MessageSquare size={16} />
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

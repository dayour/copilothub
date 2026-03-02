// ---------------------------------------------------------------------------
// App.tsx -- CopilotHub main application shell
// Assembles TitleBar, TabBar, AddressBar, and tab content area.
// ---------------------------------------------------------------------------

import { useCallback } from 'react';
import { useTabStore } from './store/tabStore';
import { useAppStore } from './store/appStore';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { AddressBar } from './components/AddressBar';
import { ChatMessageList } from './components/ChatMessageList';
import { ChatInput } from './components/ChatInput';
import { TerminalTab } from './components/TerminalTab';
import { VSCodeTab } from './components/VSCodeTab';
import { NewTabPage } from './components/NewTabPage';
import { CommandPalette } from './components/CommandPalette';
import { CopilotSidebar } from './components/CopilotSidebar';
import { RunbookMarketplace } from './components/RunbookMarketplace';
import { CalendarApp } from './components/demos/CalendarApp';
import { MechanicApp } from './components/demos/MechanicApp';
import { CoffeeShopApp } from './components/demos/CoffeeShopApp';
import { AdaptiveCardApp } from './components/demos/AdaptiveCardApp';
import { WiringDiagramApp } from './components/demos/WiringDiagramApp';
import { CopilotStudioGuide } from './components/demos/CopilotStudioGuide';
import { MediaAssetStudio } from './components/demos/MediaAssetStudio';
import { AnimationStudio } from './components/demos/AnimationStudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEntraAuth } from './hooks/useEntraAuth';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useSidecar } from './hooks/useSidecar';

function BrowserTabContent({ tab }: { tab: { id: string; url: string; isActive: boolean } }) {
  const handleIframeLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const title = (e.target as HTMLIFrameElement).contentDocument?.title;
      if (title) useTabStore.getState().updateTabTitle(tab.id, title);
    } catch {
      // Cross-origin, can't access title
    }
  }, [tab.id]);

  // For MVP, render browser tabs as iframes.
  // Future: use Tauri multi-webview API for true WebView2 instances.
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
      <div className="flex-1 overflow-hidden">
        <ChatMessageList />
      </div>
      <ChatInput />
    </div>
  );
}

function App() {
  useTheme();
  useKeyboardShortcuts();
  useChat(); // Initialize event bridge listeners
  useEntraAuth();
  useSidecar();

  const tabs = useTabStore((s) => s.tabs);
  const activeTab = useTabStore((s) => s.activeTab());
  const verticalTabsEnabled = useAppStore((s) => s.verticalTabsEnabled);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-primary">
      {/* Titlebar */}
      <TitleBar />

      {/* Main layout: optional vertical tabs sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical tabs sidebar (when enabled) */}
        {verticalTabsEnabled && (
          <div className="flex-shrink-0" style={{ width: 'var(--spacing-sidebar-width)' }}>
            <TabBar vertical />
          </div>
        )}

        {/* Main content column */}
        <div className="flex flex-col flex-1 overflow-hidden">
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
                case 'chat':
                  return <ChatTabContent key={tab.id} isActive={tab.isActive} />;
                case 'vscode':
                  return <VSCodeTab key={tab.id} isActive={tab.isActive} />;
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
                default:
                  return null;
              }
            })}
          </div>
        </div>

        <CopilotSidebar />
      </div>

      {/* Command Palette overlay */}
      <CommandPalette />
    </div>
  );
}

export default App;

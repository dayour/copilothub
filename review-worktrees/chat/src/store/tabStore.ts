// ---------------------------------------------------------------------------
// tabStore.ts -- Zustand store for tab management in CopilotHub
// Handles browser, chat, vscode, and terminal tabs with history navigation.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getMicrosoftPanelDefaultUrl, isMicrosoftPanelTab } from '../lib/microsoftPanels';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TabType = 'browser' | 'browser-use' | 'chat' | 'vscode' | 'terminal' | 'runbook' | 'copilot-studio' | 'power-platform' | 'demo-calendar' | 'demo-mechanic' | 'demo-coffeeshop' | 'demo-adaptive-cards' | 'demo-wiring' | 'demo-studio-guide' | 'demo-media-assets' | 'demo-animations' | 'showcase-coffee' | 'showcase-clothing' | 'showcase-insurance' | 'showcase-it-helpdesk' | 'showcase-seller' | 'showcase-fleet' | 'showcase-fuel' | 'showcase-dayour-protocol';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  /** Only meaningful for webview-backed tabs. Empty string for non-web tabs. */
  url: string;
  favicon: string;
  isActive: boolean;
  isPinned: boolean;
  /** Navigation history stack (URLs for browser, labels for others). */
  historyStack: string[];
  /** Current position within historyStack (-1 means empty). */
  historyIndex: number;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface TabStore {
  // -- State --
  tabs: Tab[];

  // -- Computed accessors (implemented as getters via actions) --
  activeTab: () => Tab | undefined;
  tabCount: () => number;
  browserTabs: () => Tab[];

  // -- Actions --
  addTab: (type: TabType, url?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabUrl: (id: string, url: string) => void;
  updateTabFavicon: (id: string, favicon: string) => void;
  setTabLoading: (id: string, loading: boolean) => void;
  navigateBack: (id: string) => void;
  navigateForward: (id: string) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  pinTab: (id: string) => void;
  unpinTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  duplicateTab: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _tabIdCounter = 0;
function nextTabId(): string {
  _tabIdCounter += 1;
  return `tab-${_tabIdCounter}-${Date.now()}`;
}

const DEFAULT_TITLES: Record<TabType, string> = {
  browser: 'New Tab',
  'browser-use': 'Browser Use',
  chat: 'Copilot Chat',
  vscode: 'VS Code',
  terminal: 'Terminal',
  runbook: 'Runbook Marketplace',
  'copilot-studio': 'Copilot Studio',
  'power-platform': 'Power Platform',
  'demo-calendar': 'Calendar App',
  'demo-mechanic': 'Mechanic Shop',
  'demo-coffeeshop': 'Coffee Shop POS',
  'demo-adaptive-cards': 'Adaptive Card Builder',
  'demo-wiring': 'Wiring Diagram',
  'demo-studio-guide': 'Copilot Studio Guide',
  'demo-media-assets': 'Media Asset Studio',
  'demo-animations': 'Animation Studio',
  'showcase-coffee': 'Coffee Virtual Coach',
  'showcase-clothing': 'Clothing Power Analysis',
  'showcase-insurance': 'Insurance Claims Assistant',
  'showcase-it-helpdesk': 'IT Help Desk',
  'showcase-seller': 'Seller Prospect',
  'showcase-fleet': 'Fleet Coordinator',
  'showcase-fuel': 'Fuel Tracking',
  'showcase-dayour-protocol': 'DAYOUR Protocol',
};

function createTab(type: TabType, url?: string): Tab {
  const resolvedUrl =
    type === 'browser'
      ? (url ?? '')
      : isMicrosoftPanelTab(type)
        ? (url ?? getMicrosoftPanelDefaultUrl(type))
        : '';
  return {
    id: nextTabId(),
    type,
    title: DEFAULT_TITLES[type],
    url: resolvedUrl,
    favicon: '',
    isActive: false,
    isPinned: false,
    historyStack: resolvedUrl ? [resolvedUrl] : [],
    historyIndex: resolvedUrl ? 0 : -1,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

/** Recalculate canGoBack / canGoForward from history state. */
function refreshHistoryFlags(tab: Tab): void {
  tab.canGoBack = tab.historyIndex > 0;
  tab.canGoForward = tab.historyIndex < tab.historyStack.length - 1;
}

// ---------------------------------------------------------------------------
// Initial tabs -- one persistent chat tab and one browser tab
// ---------------------------------------------------------------------------

function buildInitialTabs(): Tab[] {
  const chatTab = createTab('chat');
  chatTab.isPinned = true; // chat tab is persistent
  chatTab.isActive = false;

  const browserTab = createTab('browser');
  browserTab.isActive = true;

  return [chatTab, browserTab];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTabStore = create<TabStore>()(
  immer((set, get) => ({
    // -- State ---------------------------------------------------------------
    tabs: buildInitialTabs(),

    // -- Computed accessors --------------------------------------------------
    activeTab: () => get().tabs.find((t) => t.isActive),
    tabCount: () => get().tabs.length,
    browserTabs: () => get().tabs.filter((t) => t.type === 'browser'),

    // -- Actions -------------------------------------------------------------

    addTab: (type: TabType, url?: string) => {
      set((state) => {
        // Deactivate all current tabs
        for (const tab of state.tabs) {
          tab.isActive = false;
        }
        const newTab = createTab(type, url);
        newTab.isActive = true;
        state.tabs.push(newTab);
      });
    },

    closeTab: (id: string) => {
      set((state) => {
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;

        const tab = state.tabs[idx];

        // Do not close the pinned chat tab -- it is persistent
        if (tab.isPinned && tab.type === 'chat') return;

        // Prevent closing the last tab
        if (state.tabs.length <= 1) return;

        const wasActive = tab.isActive;
        state.tabs.splice(idx, 1);

        // If the closed tab was active, activate an adjacent tab
        if (wasActive && state.tabs.length > 0) {
          const nextIdx = Math.min(idx, state.tabs.length - 1);
          state.tabs[nextIdx].isActive = true;
        }
      });
    },

    setActiveTab: (id: string) => {
      set((state) => {
        const exists = state.tabs.some((tab) => tab.id === id);
        if (!exists) return;
        for (const tab of state.tabs) {
          tab.isActive = tab.id === id;
        }
      });
    },

    updateTabTitle: (id: string, title: string) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (tab) tab.title = title;
      });
    },

    updateTabUrl: (id: string, url: string) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (!tab || (tab.type !== 'browser' && !isMicrosoftPanelTab(tab.type))) return;

        // Push to history stack, truncating any forward history
        if (tab.historyIndex >= 0 && tab.historyStack[tab.historyIndex] === url) {
          // Same URL -- no history change
          tab.url = url;
          return;
        }
        tab.historyStack = tab.historyStack.slice(0, tab.historyIndex + 1);
        tab.historyStack.push(url);
        tab.historyIndex = tab.historyStack.length - 1;
        tab.url = url;
        refreshHistoryFlags(tab);
      });
    },

    updateTabFavicon: (id: string, favicon: string) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (tab) tab.favicon = favicon;
      });
    },

    setTabLoading: (id: string, loading: boolean) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (tab) tab.isLoading = loading;
      });
    },

    navigateBack: (id: string) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (!tab || !tab.canGoBack) return;
        tab.historyIndex -= 1;
        tab.url = tab.historyStack[tab.historyIndex];
        refreshHistoryFlags(tab);
      });
    },

    navigateForward: (id: string) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (!tab || !tab.canGoForward) return;
        tab.historyIndex += 1;
        tab.url = tab.historyStack[tab.historyIndex];
        refreshHistoryFlags(tab);
      });
    },

    moveTab: (fromIndex: number, toIndex: number) => {
      set((state) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.tabs.length ||
          toIndex < 0 ||
          toIndex >= state.tabs.length ||
          fromIndex === toIndex
        ) {
          return;
        }
        const [moved] = state.tabs.splice(fromIndex, 1);
        state.tabs.splice(toIndex, 0, moved);
      });
    },

    pinTab: (id: string) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        if (tab) tab.isPinned = true;
      });
    },

    unpinTab: (id: string) => {
      set((state) => {
        const tab = state.tabs.find((t) => t.id === id);
        // Do not unpin the persistent chat tab
        if (tab && !(tab.type === 'chat' && tab.isPinned)) {
          tab.isPinned = false;
        }
      });
    },

    closeOtherTabs: (id: string) => {
      set((state) => {
        state.tabs = state.tabs.filter((t) => t.id === id || (t.isPinned && t.type === 'chat'));
        // Ensure the kept tab is active
        const kept = state.tabs.find((t) => t.id === id);
        if (kept) {
          for (const tab of state.tabs) {
            tab.isActive = tab.id === id;
          }
        }
      });
    },

    closeTabsToRight: (id: string) => {
      set((state) => {
        const idx = state.tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;
        // Keep pinned chat tabs that appear to the right
        const rightTabs = state.tabs.slice(idx + 1);
        const survivingRight = rightTabs.filter(
          (t) => t.isPinned && t.type === 'chat',
        );
        state.tabs = [...state.tabs.slice(0, idx + 1), ...survivingRight];
        // If active tab was closed, activate the reference tab
        if (!state.tabs.some((t) => t.isActive)) {
          state.tabs[idx].isActive = true;
        }
      });
    },

    duplicateTab: (id: string) => {
      set((state) => {
        const source = state.tabs.find((t) => t.id === id);
        if (!source) return;

        // Deactivate all tabs
        for (const tab of state.tabs) {
          tab.isActive = false;
        }

        const dupe = createTab(source.type, source.url);
        dupe.title = source.title;
        dupe.favicon = source.favicon;
        dupe.isActive = true;
        // Copy history
        dupe.historyStack = [...source.historyStack];
        dupe.historyIndex = source.historyIndex;
        refreshHistoryFlags(dupe);

        // Insert right after the source tab
        const sourceIdx = state.tabs.findIndex((t) => t.id === id);
        state.tabs.splice(sourceIdx + 1, 0, dupe);
      });
    },
  })),
);

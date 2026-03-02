import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTabStore, type Tab } from './tabStore';

function makeInitialTabs(): Tab[] {
  return [
    {
      id: 'chat-tab',
      type: 'chat',
      title: 'Copilot Chat',
      url: '',
      favicon: '',
      isActive: false,
      isPinned: true,
      historyStack: [],
      historyIndex: -1,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    },
    {
      id: 'browser-tab',
      type: 'browser',
      title: 'New Tab',
      url: '',
      favicon: '',
      isActive: true,
      isPinned: false,
      historyStack: [],
      historyIndex: -1,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    },
  ];
}

describe('tabStore', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: makeInitialTabs() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initial state has exactly chat + browser tabs with browser active', () => {
    const { tabs } = useTabStore.getState();
    expect(tabs).toHaveLength(2);
    expect(tabs.map((t) => t.type)).toEqual(['chat', 'browser']);
    expect(tabs.find((t) => t.type === 'browser')?.isActive).toBe(true);
    expect(tabs.find((t) => t.type === 'chat')?.isActive).toBe(false);
  });

  it("addTab('browser') adds and activates new browser tab", () => {
    const store = useTabStore.getState();
    const countBefore = store.tabCount();

    store.addTab('browser', 'https://example.com');

    const { tabs } = useTabStore.getState();
    expect(tabs).toHaveLength(countBefore + 1);
    expect(tabs.at(-1)?.type).toBe('browser');
    expect(tabs.at(-1)?.isActive).toBe(true);
    expect(tabs.filter((t) => t.isActive)).toHaveLength(1);
  });

  it("addTab('terminal') adds terminal tab", () => {
    useTabStore.getState().addTab('terminal');
    expect(useTabStore.getState().tabs.at(-1)?.type).toBe('terminal');
  });

  it("addTab('runbook') adds runbook tab", () => {
    useTabStore.getState().addTab('runbook');
    expect(useTabStore.getState().tabs.at(-1)?.type).toBe('runbook');
  });

  it('closeTab closes tab by ID and activates adjacent when closed tab was active', () => {
    const store = useTabStore.getState();
    store.addTab('terminal');
    const activeId = useTabStore.getState().activeTab()?.id as string;

    store.closeTab(activeId);

    const state = useTabStore.getState();
    expect(state.tabs.some((t) => t.id === activeId)).toBe(false);
    expect(state.activeTab()?.id).toBe('browser-tab');
  });

  it('closeTab does not close pinned persistent chat tab', () => {
    useTabStore.getState().closeTab('chat-tab');
    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.tabs.some((t) => t.id === 'chat-tab')).toBe(true);
  });

  it('closeTab does not close the last remaining tab', () => {
    useTabStore.setState({
      tabs: [
        {
          ...makeInitialTabs()[1],
          id: 'only-tab',
          isActive: true,
        },
      ],
    });

    useTabStore.getState().closeTab('only-tab');
    expect(useTabStore.getState().tabs).toHaveLength(1);
    expect(useTabStore.getState().tabs[0].id).toBe('only-tab');
  });

  it('setActiveTab deactivates previous active tab and activates new tab', () => {
    const store = useTabStore.getState();
    store.setActiveTab('chat-tab');

    const state = useTabStore.getState();
    expect(state.tabs.find((t) => t.id === 'chat-tab')?.isActive).toBe(true);
    expect(state.tabs.find((t) => t.id === 'browser-tab')?.isActive).toBe(false);
  });

  it('updateTabTitle updates title for specified tab', () => {
    useTabStore.getState().updateTabTitle('browser-tab', 'Docs');
    expect(useTabStore.getState().tabs.find((t) => t.id === 'browser-tab')?.title).toBe('Docs');
  });

  it('updateTabUrl updates URL and truncates forward history', () => {
    const store = useTabStore.getState();
    const id = 'browser-tab';

    store.updateTabUrl(id, 'https://a.com');
    store.updateTabUrl(id, 'https://b.com');
    store.updateTabUrl(id, 'https://c.com');
    store.navigateBack(id); // now at b.com
    store.updateTabUrl(id, 'https://d.com'); // should drop c.com forward history

    const tab = useTabStore.getState().tabs.find((t) => t.id === id) as Tab;
    expect(tab.url).toBe('https://d.com');
    expect(tab.historyStack).toEqual(['https://a.com', 'https://b.com', 'https://d.com']);
    expect(tab.historyIndex).toBe(2);
    expect(tab.canGoBack).toBe(true);
    expect(tab.canGoForward).toBe(false);
  });

  it('navigateBack and navigateForward move through history and update flags', () => {
    const store = useTabStore.getState();
    const id = 'browser-tab';
    store.updateTabUrl(id, 'https://a.com');
    store.updateTabUrl(id, 'https://b.com');
    store.updateTabUrl(id, 'https://c.com');

    store.navigateBack(id);
    let tab = useTabStore.getState().tabs.find((t) => t.id === id) as Tab;
    expect(tab.url).toBe('https://b.com');
    expect(tab.canGoBack).toBe(true);
    expect(tab.canGoForward).toBe(true);

    store.navigateBack(id);
    tab = useTabStore.getState().tabs.find((t) => t.id === id) as Tab;
    expect(tab.url).toBe('https://a.com');
    expect(tab.canGoBack).toBe(false);
    expect(tab.canGoForward).toBe(true);

    store.navigateForward(id);
    tab = useTabStore.getState().tabs.find((t) => t.id === id) as Tab;
    expect(tab.url).toBe('https://b.com');
  });

  it('pinTab and unpinTab toggle pin state', () => {
    const store = useTabStore.getState();
    store.pinTab('browser-tab');
    expect(useTabStore.getState().tabs.find((t) => t.id === 'browser-tab')?.isPinned).toBe(true);
    store.unpinTab('browser-tab');
    expect(useTabStore.getState().tabs.find((t) => t.id === 'browser-tab')?.isPinned).toBe(false);
  });

  it('closeOtherTabs closes all except specified tab and pinned chat', () => {
    const store = useTabStore.getState();
    store.addTab('terminal');
    store.addTab('runbook');
    const targetId = useTabStore.getState().tabs.find((t) => t.type === 'terminal')?.id as string;

    store.closeOtherTabs(targetId);

    const { tabs } = useTabStore.getState();
    expect(tabs.map((t) => t.id).sort()).toEqual(['chat-tab', targetId].sort());
    expect(useTabStore.getState().activeTab()?.id).toBe(targetId);
  });

  it('closeTabsToRight closes all tabs to the right of specified tab', () => {
    const store = useTabStore.getState();
    store.addTab('terminal');
    store.addTab('runbook');

    store.closeTabsToRight('browser-tab');

    const { tabs } = useTabStore.getState();
    expect(tabs.map((t) => t.id)).toEqual(['chat-tab', 'browser-tab']);
    expect(useTabStore.getState().activeTab()?.id).toBe('browser-tab');
  });

  it('duplicateTab creates a copy with same type and URL', () => {
    const store = useTabStore.getState();
    store.updateTabUrl('browser-tab', 'https://copilot.microsoft.com');
    store.updateTabTitle('browser-tab', 'Copilot');
    const source = useTabStore.getState().tabs.find((t) => t.id === 'browser-tab') as Tab;

    store.duplicateTab('browser-tab');

    const tabs = useTabStore.getState().tabs;
    expect(tabs).toHaveLength(3);
    const duplicate = tabs[2];
    expect(duplicate.id).not.toBe(source.id);
    expect(duplicate.type).toBe(source.type);
    expect(duplicate.url).toBe(source.url);
    expect(duplicate.title).toBe(source.title);
    expect(duplicate.isActive).toBe(true);
  });

  it('moveTab reorders tabs in array', () => {
    const store = useTabStore.getState();
    store.addTab('terminal');
    const before = useTabStore.getState().tabs.map((t) => t.type);
    expect(before).toEqual(['chat', 'browser', 'terminal']);

    store.moveTab(2, 1);
    const after = useTabStore.getState().tabs.map((t) => t.type);
    expect(after).toEqual(['chat', 'terminal', 'browser']);
  });

  it('activeTab returns currently active tab', () => {
    useTabStore.getState().setActiveTab('chat-tab');
    expect(useTabStore.getState().activeTab()?.id).toBe('chat-tab');
  });

  it('tabCount returns correct count', () => {
    const store = useTabStore.getState();
    expect(store.tabCount()).toBe(2);
    store.addTab('terminal');
    expect(useTabStore.getState().tabCount()).toBe(3);
  });

  it('browserTabs filters only browser tabs', () => {
    const store = useTabStore.getState();
    store.addTab('terminal');
    store.addTab('browser');

    const browsers = useTabStore.getState().browserTabs();
    expect(browsers.every((t) => t.type === 'browser')).toBe(true);
    expect(browsers).toHaveLength(2);
  });

  it('closeTab with nonexistent ID is a no-op', () => {
    const before = useTabStore.getState().tabs.length;
    useTabStore.getState().closeTab('nonexistent-id-xyz');
    expect(useTabStore.getState().tabs.length).toBe(before);
  });

  it('setActiveTab with nonexistent ID is a no-op', () => {
    const activeBefore = useTabStore.getState().activeTab();
    useTabStore.getState().setActiveTab('nonexistent-id-xyz');
    expect(useTabStore.getState().activeTab()?.id).toBe(activeBefore?.id);
  });
});

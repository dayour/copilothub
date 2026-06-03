import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TabBar } from './TabBar';
import { useTabStore, type Tab } from '../store/tabStore';
import { useAppStore } from '../store/appStore';

function makeTabs(): Tab[] {
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

describe('TabBar', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: makeTabs() });
    useAppStore.setState({
      theme: 'dark',
      sidebarPosition: 'left',
      verticalTabsEnabled: false,
      sidecarStatus: 'stopped',
      isAuthenticated: false,
      commandPaletteOpen: false,
      settingsPanelOpen: false,
      copilotSidebarOpen: false,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders horizontal tabs by default', () => {
    render(<TabBar />);
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
  });

  it('renders initial tabs', () => {
    render(<TabBar />);
    expect(screen.getByRole('tab', { name: 'Copilot Chat' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'New Tab' })).toBeInTheDocument();
  });

  it('click tab activates it', () => {
    const setActiveSpy = vi.spyOn(useTabStore.getState(), 'setActiveTab');
    render(<TabBar />);

    fireEvent.click(screen.getByRole('tab', { name: 'Copilot Chat' }));

    expect(setActiveSpy).toHaveBeenCalledWith('chat-tab');
  });

  it('new tab button adds browser tab', () => {
    const addTabSpy = vi.spyOn(useTabStore.getState(), 'addTab');
    const countBefore = useTabStore.getState().tabs.length;
    render(<TabBar />);

    fireEvent.click(screen.getByRole('button', { name: 'New tab' }));

    expect(addTabSpy).toHaveBeenCalledWith('browser');
    const tabsAfter = useTabStore.getState().tabs;
    expect(tabsAfter.length).toBe(countBefore + 1);
    expect(tabsAfter.at(-1)?.type).toBe('browser');
  });

  it('terminal button adds a terminal tab', () => {
    const addTabSpy = vi.spyOn(useTabStore.getState(), 'addTab');
    const countBefore = useTabStore.getState().tabs.length;
    render(<TabBar />);

    fireEvent.click(screen.getByRole('button', { name: 'New terminal tab' }));

    expect(addTabSpy).toHaveBeenCalledWith('terminal');
    const tabsAfter = useTabStore.getState().tabs;
    expect(tabsAfter.length).toBe(countBefore + 1);
    expect(tabsAfter.at(-1)?.type).toBe('terminal');
  });

  it('settings button opens the settings panel', () => {
    render(<TabBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));

    expect(useAppStore.getState().settingsPanelOpen).toBe(true);
  });

  it('close button closes tab', () => {
    const closeSpy = vi.spyOn(useTabStore.getState(), 'closeTab');
    render(<TabBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Close New Tab' }));

    expect(closeSpy).toHaveBeenCalledWith('browser-tab');
  });

  it('close button becomes visible on keyboard focus', () => {
    render(<TabBar />);

    const closeButton = screen.getByRole('button', { name: 'Close New Tab' });

    expect(closeButton.className).toContain('focus-visible:opacity-100');
    expect(closeButton.className).toContain('group-focus-within:opacity-100');
  });

  it('pinned tabs show no close button', () => {
    render(<TabBar />);
    expect(screen.queryByRole('button', { name: 'Close Copilot Chat' })).not.toBeInTheDocument();
  });

  it('vertical mode renders differently', () => {
    render(<TabBar vertical />);
    const sidebarTabList = screen.getByRole('tablist');
    expect(sidebarTabList.className).toContain('flex-col');
    expect(sidebarTabList).toHaveAttribute('aria-orientation', 'vertical');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useAppStore } from '../store/appStore';
import { useTabStore, type Tab } from '../store/tabStore';

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

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTabStore.setState({ tabs: makeTabs() });
    useAppStore.setState({
      theme: 'dark',
      sidebarPosition: 'left',
      verticalTabsEnabled: false,
      projectSidebarCollapsed: false,
      currentProjectPath: null,
      recentProjects: [],
      sidecarStatus: 'stopped',
      isAuthenticated: false,
      commandPaletteOpen: false,
      settingsPanelOpen: false,
      copilotSidebarOpen: false,
      assistantPaneMode: 'copilot',
      showActionOverlay: true,
      browserUseAutoScreenshot: true,
      browserUseMaxSteps: 50,
      connectedSdkSession: null,
      actionTimelineDocked: 'right',
    });
  });

  it('opens the project picker callback with Ctrl+O', () => {
    const onAddProject = vi.fn();
    renderHook(() => useKeyboardShortcuts(onAddProject));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true }));

    expect(onAddProject).toHaveBeenCalledTimes(1);
  });

  it('toggles settings with Ctrl+,', () => {
    renderHook(() => useKeyboardShortcuts());

    document.dispatchEvent(new KeyboardEvent('keydown', { key: ',', ctrlKey: true }));

    expect(useAppStore.getState().settingsPanelOpen).toBe(true);
  });

  it('toggles the Git review pane with Ctrl+Shift+R', () => {
    renderHook(() => useKeyboardShortcuts());

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, shiftKey: true }));

    expect(useAppStore.getState().copilotSidebarOpen).toBe(true);
    expect(useAppStore.getState().assistantPaneMode).toBe('review');
  });
});

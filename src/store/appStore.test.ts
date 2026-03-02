import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useAppStore.setState({
      theme: 'dark',
      sidebarPosition: 'left',
      verticalTabsEnabled: false,
      sidecarStatus: 'stopped',
      commandPaletteOpen: false,
      copilotSidebarOpen: false,
      isAuthenticated: false,
    });
  });

  it('has correct default state', () => {
    const state = useAppStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.sidecarStatus).toBe('stopped');
    expect(state.verticalTabsEnabled).toBe(false);
  });

  it('setTheme updates theme', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('toggleVerticalTabs flips state', () => {
    useAppStore.getState().toggleVerticalTabs();
    expect(useAppStore.getState().verticalTabsEnabled).toBe(true);
    useAppStore.getState().toggleVerticalTabs();
    expect(useAppStore.getState().verticalTabsEnabled).toBe(false);
  });

  it('setSidecarStatus updates status', () => {
    useAppStore.getState().setSidecarStatus('running');
    expect(useAppStore.getState().sidecarStatus).toBe('running');
  });

  it('toggleCommandPalette flips state', () => {
    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
    useAppStore.getState().toggleCommandPalette();
    expect(useAppStore.getState().commandPaletteOpen).toBe(true);
  });
});

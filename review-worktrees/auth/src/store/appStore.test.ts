import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from './appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useAppStore.setState({
      theme: 'dark',
      sidebarPosition: 'left',
      verticalTabsEnabled: false,
      projectSidebarCollapsed: false,
      currentProjectPath: null,
      recentProjects: [],
      sidecarStatus: 'stopped',
      commandPaletteOpen: false,
      settingsPanelOpen: false,
      copilotSidebarOpen: false,
      assistantPaneMode: 'copilot',
      isAuthenticated: false,
      showActionOverlay: true,
      browserUseAutoScreenshot: true,
      browserUseMaxSteps: 50,
      connectedSdkSession: null,
      actionTimelineDocked: 'right',
      defaultEditor: 'vscode',
      terminalShell: 'powershell',
      sandboxMode: 'workspace-write',
      approvalPolicy: 'on-request',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct default state', () => {
    const state = useAppStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.sidecarStatus).toBe('stopped');
    expect(state.verticalTabsEnabled).toBe(false);
    expect(state.projectSidebarCollapsed).toBe(false);
    expect(state.currentProjectPath).toBeNull();
    expect(state.recentProjects).toEqual([]);
    expect(state.settingsPanelOpen).toBe(false);
    expect(state.defaultEditor).toBe('vscode');
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

  it('toggleReviewPane opens the assistant in review mode and toggles back to Copilot', () => {
    useAppStore.getState().toggleReviewPane();

    expect(useAppStore.getState().copilotSidebarOpen).toBe(true);
    expect(useAppStore.getState().assistantPaneMode).toBe('review');

    useAppStore.getState().toggleReviewPane();

    expect(useAppStore.getState().assistantPaneMode).toBe('copilot');
  });

  it('toggleCommandPalette flips state', () => {
    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
    useAppStore.getState().toggleCommandPalette();
    expect(useAppStore.getState().commandPaletteOpen).toBe(true);
  });

  it('toggleSettingsPanel flips state and closes command palette', () => {
    useAppStore.setState({ commandPaletteOpen: true });

    useAppStore.getState().toggleSettingsPanel();

    const state = useAppStore.getState();
    expect(state.settingsPanelOpen).toBe(true);
    expect(state.commandPaletteOpen).toBe(false);
  });

  it('toggleProjectSidebar flips collapsed state', () => {
    expect(useAppStore.getState().projectSidebarCollapsed).toBe(false);
    useAppStore.getState().toggleProjectSidebar();
    expect(useAppStore.getState().projectSidebarCollapsed).toBe(true);
  });

  it('setCurrentProject stores the active project and recent project list', () => {
    useAppStore.getState().setCurrentProject('C:/Work/Alpha');
    useAppStore.getState().setCurrentProject('C:/Work/Beta');
    useAppStore.getState().setCurrentProject('C:/Work/Alpha');

    const state = useAppStore.getState();
    expect(state.currentProjectPath).toBe('C:/Work/Alpha');
    expect(state.recentProjects).toEqual(['C:/Work/Alpha', 'C:/Work/Beta']);
  });

  it('clamps browser step settings to a safe range', () => {
    useAppStore.getState().setBrowserUseMaxSteps(999);
    expect(useAppStore.getState().browserUseMaxSteps).toBe(200);

    useAppStore.getState().setBrowserUseMaxSteps(0);
    expect(useAppStore.getState().browserUseMaxSteps).toBe(1);
  });

  it('stores terminal shell preferences', () => {
    useAppStore.getState().setTerminalShell('command-prompt');
    expect(useAppStore.getState().terminalShell).toBe('command-prompt');
  });

  it('keeps shell and sandbox preferences aligned for WSL', () => {
    useAppStore.getState().setSandboxMode('wsl');

    expect(useAppStore.getState().sandboxMode).toBe('wsl');
    expect(useAppStore.getState().terminalShell).toBe('wsl');

    useAppStore.getState().setTerminalShell('powershell');

    expect(useAppStore.getState().sandboxMode).toBe('workspace-write');
    expect(useAppStore.getState().terminalShell).toBe('powershell');
  });
});

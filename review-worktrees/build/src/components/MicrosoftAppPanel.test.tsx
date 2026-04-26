import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MicrosoftAppPanel } from './MicrosoftAppPanel';
import { useAppStore } from '../store/appStore';
import { useTabStore, type Tab } from '../store/tabStore';
import { POWER_APPS_URL, POWER_AUTOMATE_URL } from '../lib/microsoftPanels';

const { useTauriWebviewMock } = vi.hoisted(() => ({
  useTauriWebviewMock: vi.fn(() => ({ isTauri: false })),
}));

vi.mock('../hooks/useTauriWebview', () => ({
  useTauriWebview: useTauriWebviewMock,
}));

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
      id: 'power-panel',
      type: 'power-platform',
      title: 'Power Platform',
      url: POWER_APPS_URL,
      favicon: '',
      isActive: true,
      isPinned: false,
      historyStack: [POWER_APPS_URL],
      historyIndex: 0,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    },
  ];
}

describe('MicrosoftAppPanel', () => {
  beforeEach(() => {
    useTauriWebviewMock.mockReturnValue({ isTauri: false });
    useTauriWebviewMock.mockClear();
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
    useTabStore.setState({ tabs: makeTabs() });
    vi.restoreAllMocks();
  });

  it('surfaces browser fallback limitations explicitly', () => {
    render(
      <MicrosoftAppPanel
        tabId="power-panel"
        tabType="power-platform"
        url={POWER_APPS_URL}
        isActive
      />,
    );

    expect(screen.getByText('Browser fallback is limited for Microsoft maker surfaces')).toBeInTheDocument();
    expect(screen.getByText('Open Power Platform')).toBeInTheDocument();
  });

  it('switches curated destinations within the power platform panel', () => {
    render(
      <MicrosoftAppPanel
        tabId="power-panel"
        tabType="power-platform"
        url={POWER_APPS_URL}
        isActive
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Power Automate' }));

    expect(useTabStore.getState().tabs.find((tab) => tab.id === 'power-panel')?.url).toBe(POWER_AUTOMATE_URL);
  });

  it('falls back to the curated Microsoft URL when a panel tab receives an untrusted destination', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MicrosoftAppPanel
        tabId="power-panel"
        tabType="power-platform"
        url="https://example.com/phishing"
        isActive
      />,
    );

    expect(useTauriWebviewMock).toHaveBeenCalledWith(
      'power-panel',
      POWER_APPS_URL,
      true,
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open externally' }));

    expect(openSpy).toHaveBeenCalledWith(POWER_APPS_URL, '_blank', 'noopener,noreferrer');
  });
});

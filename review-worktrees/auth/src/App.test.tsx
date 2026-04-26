import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import App from './App';
import { useAppStore } from './store/appStore';
import { useTabStore, type Tab } from './store/tabStore';

vi.mock('./components/TitleBar', () => ({
  TitleBar: () => <div>Title Bar</div>,
}));

vi.mock('./components/TabBar', () => ({
  TabBar: ({ vertical }: { vertical?: boolean }) => <div>{vertical ? 'Vertical Tab Bar' : 'Tab Bar'}</div>,
}));

vi.mock('./components/AddressBar', () => ({
  AddressBar: () => <div>Address Bar</div>,
}));

vi.mock('./components/ChatMessageList', () => ({
  ChatMessageList: () => <div>Chat Message List</div>,
}));

vi.mock('./components/ChatInput', () => ({
  ChatInput: () => <div>Chat Input</div>,
}));

vi.mock('./components/ChatThreadBar', () => ({
  ChatThreadBar: () => <div>Chat Thread Bar</div>,
}));

vi.mock('./components/TerminalTab', () => ({
  TerminalTab: () => <div>Terminal Tab</div>,
}));

vi.mock('./components/VSCodeTab', () => ({
  VSCodeTab: () => <div>VS Code Tab</div>,
}));

vi.mock('./components/NewTabPage', () => ({
  NewTabPage: () => <div>New Tab Page</div>,
}));

vi.mock('./components/CommandPalette', () => ({
  CommandPalette: () => <div>Command Palette</div>,
}));

vi.mock('./components/CopilotSidebar', () => ({
  CopilotSidebar: () => <div>Copilot Sidebar</div>,
}));

vi.mock('./components/GitReviewPane', () => ({
  GitReviewPane: () => <div>Git Review Pane</div>,
}));

vi.mock('./components/SettingsPanel', () => ({
  SettingsPanel: () => <div>Settings Panel</div>,
}));

vi.mock('./components/RunbookMarketplace', () => ({
  RunbookMarketplace: () => <div>Runbook Marketplace</div>,
}));

vi.mock('./components/demos/CalendarApp', () => ({
  CalendarApp: () => <div>Calendar App</div>,
}));

vi.mock('./components/demos/MechanicApp', () => ({
  MechanicApp: () => <div>Mechanic App</div>,
}));

vi.mock('./components/demos/CoffeeShopApp', () => ({
  CoffeeShopApp: () => <div>Coffee Shop App</div>,
}));

vi.mock('./components/demos/AdaptiveCardApp', () => ({
  AdaptiveCardApp: () => <div>Adaptive Card App</div>,
}));

vi.mock('./components/demos/WiringDiagramApp', () => ({
  WiringDiagramApp: () => <div>Wiring Diagram App</div>,
}));

vi.mock('./components/demos/CopilotStudioGuide', () => ({
  CopilotStudioGuide: () => <div>Copilot Studio Guide</div>,
}));

vi.mock('./components/demos/MediaAssetStudio', () => ({
  MediaAssetStudio: () => <div>Media Asset Studio</div>,
}));

vi.mock('./components/demos/AnimationStudio', () => ({
  AnimationStudio: () => <div>Animation Studio</div>,
}));

vi.mock('./components/showcases/CoffeeVirtualCoach', () => ({
  CoffeeVirtualCoach: () => <div>Coffee Virtual Coach</div>,
}));

vi.mock('./components/showcases/ClothingPowerAnalysis', () => ({
  ClothingPowerAnalysis: () => <div>Clothing Power Analysis</div>,
}));

vi.mock('./components/showcases/InsuranceClaimsAssistant', () => ({
  InsuranceClaimsAssistant: () => <div>Insurance Claims Assistant</div>,
}));

vi.mock('./components/showcases/ITHelpDesk', () => ({
  ITHelpDesk: () => <div>IT Help Desk</div>,
}));

vi.mock('./components/showcases/SellerProspect', () => ({
  SellerProspect: () => <div>Seller Prospect</div>,
}));

vi.mock('./components/showcases/FleetCoordinator', () => ({
  FleetCoordinator: () => <div>Fleet Coordinator</div>,
}));

vi.mock('./components/showcases/FuelTracking', () => ({
  FuelTracking: () => <div>Fuel Tracking</div>,
}));

vi.mock('./components/showcases/DayourProtocolSlides', () => ({
  DayourProtocolSlides: () => <div>DAYOUR Protocol Slides</div>,
}));

vi.mock('./components/BrowserUseTab', () => ({
  BrowserUseTab: () => <div>Browser Use Tab</div>,
}));

vi.mock('./components/MicrosoftAppPanel', () => ({
  MicrosoftAppPanel: () => <div>Microsoft App Panel</div>,
}));

vi.mock('./components/ProjectSidebar', () => ({
  ProjectSidebar: () => <div>Project Sidebar</div>,
}));

vi.mock('./hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('./hooks/useEntraAuth', () => ({
  useEntraAuth: vi.fn(),
}));

vi.mock('./hooks/useTheme', () => ({
  useTheme: vi.fn(),
}));

vi.mock('./hooks/useChat', () => ({
  useChat: vi.fn(),
}));

vi.mock('./hooks/useSessionLinkedTools', () => ({
  useSessionLinkedTools: vi.fn(),
}));

vi.mock('./hooks/useSidecar', () => ({
  useSidecar: vi.fn(),
}));

vi.mock('./hooks/useTauriWebview', () => ({
  useTauriWebview: () => ({ isTauri: false }),
}));

function createTab(overrides: Partial<Tab>): Tab {
  return {
    id: overrides.id ?? 'tab-1',
    type: overrides.type ?? 'browser',
    title: overrides.title ?? 'Tab',
    url: overrides.url ?? '',
    favicon: overrides.favicon ?? '',
    isActive: overrides.isActive ?? false,
    isPinned: overrides.isPinned ?? false,
    historyStack: overrides.historyStack ?? [],
    historyIndex: overrides.historyIndex ?? -1,
    isLoading: overrides.isLoading ?? false,
    canGoBack: overrides.canGoBack ?? false,
    canGoForward: overrides.canGoForward ?? false,
  };
}

describe('App shell layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
      copilotSidebarOpen: true,
      assistantPaneMode: 'copilot',
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

    useTabStore.setState({
      tabs: [
        createTab({
          id: 'chat-tab',
          type: 'chat',
          title: 'Copilot Chat',
          isPinned: true,
          isActive: false,
        }),
        createTab({
          id: 'browser-tab',
          type: 'browser',
          title: 'New Tab',
          url: 'about:blank',
          isActive: true,
          historyStack: ['about:blank'],
          historyIndex: 0,
        }),
      ],
    });
  });

  it('renders navigation, workspace, and assistant panels with existing shell features', () => {
    useAppStore.setState({ verticalTabsEnabled: true, copilotSidebarOpen: true });

    render(<App />);

    expect(screen.getByLabelText('Navigation panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Assistant panel')).toBeInTheDocument();

    expect(screen.getByText('Project Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Vertical Tab Bar')).toBeInTheDocument();
    expect(screen.getByText('Address Bar')).toBeInTheDocument();
    expect(screen.getByText('New Tab Page')).toBeInTheDocument();
    expect(screen.getByText('Copilot Sidebar')).toBeInTheDocument();
  });

  it('keeps chat usable and exposes a reopen control when the assistant panel is collapsed', () => {
    useAppStore.setState({ copilotSidebarOpen: false });
    useTabStore.setState({
      tabs: [
        createTab({
          id: 'chat-tab',
          type: 'chat',
          title: 'Copilot Chat',
          isPinned: true,
          isActive: true,
        }),
        createTab({
          id: 'browser-tab',
          type: 'browser',
          title: 'New Tab',
          url: 'about:blank',
          isActive: false,
          historyStack: ['about:blank'],
          historyIndex: 0,
        }),
      ],
    });

    render(<App />);

    expect(screen.getByText('Chat Thread Bar')).toBeInTheDocument();
    expect(screen.getByText('Chat Message List')).toBeInTheDocument();
    expect(screen.getByText('Chat Input')).toBeInTheDocument();
    expect(screen.queryByText('Address Bar')).not.toBeInTheDocument();
    expect(screen.queryByText('Copilot Sidebar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Copilot sidebar' }));

    expect(screen.getByText('Copilot Sidebar')).toBeInTheDocument();
  });

  it('renders the Git review pane when review mode is active', () => {
    useAppStore.setState({ copilotSidebarOpen: true, assistantPaneMode: 'review' });

    render(<App />);

    expect(screen.getByText('Git Review Pane')).toBeInTheDocument();
    expect(screen.queryByText('Copilot Sidebar')).not.toBeInTheDocument();
  });

  it('closes the command palette state when settings and palette become open together', () => {
    useAppStore.setState({ settingsPanelOpen: true, commandPaletteOpen: true });

    render(<App />);

    expect(useAppStore.getState().settingsPanelOpen).toBe(true);
    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
  });
});

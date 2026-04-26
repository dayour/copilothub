import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { CopilotSidebar } from './CopilotSidebar';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import { useBrowserActionStore } from '../store/browserActionStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';

const { graphClientMock, graphState } = vi.hoisted(() => ({
  graphClientMock: {
    getMe: vi.fn(),
    listCalendarEvents: vi.fn(),
    listRecentDriveFiles: vi.fn(),
    listMailMessages: vi.fn(),
  },
  graphState: {
    configured: true,
  },
}));

vi.mock('../lib/mcpClient', () => ({
  default: {
    screenshot: vi.fn(),
    snapshot: vi.fn(),
    callTool: vi.fn(),
  },
}));

vi.mock('../lib/graphClient', async () => {
  const actual = await vi.importActual<typeof import('../lib/graphClient')>('../lib/graphClient');
  return {
    ...actual,
    default: graphClientMock,
  };
});

vi.mock('../lib/graphSidebar', async () => {
  const actual = await vi.importActual<typeof import('../lib/graphSidebar')>('../lib/graphSidebar');
  return {
    ...actual,
    isGraphSidebarConfigured: vi.fn(() => graphState.configured),
  };
});

describe('CopilotSidebar Graph widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    graphState.configured = true;
    const selectedThreadId = useSessionEnvironmentStore.getState().selectedThreadId ?? 'default-thread';

    useAppStore.setState({
      theme: 'dark',
      sidebarPosition: 'left',
      verticalTabsEnabled: false,
      projectSidebarCollapsed: false,
      currentProjectPath: null,
      recentProjects: [],
      sidecarStatus: 'running',
      isAuthenticated: false,
      commandPaletteOpen: false,
      copilotSidebarOpen: true,
      showActionOverlay: true,
      browserUseAutoScreenshot: true,
      browserUseMaxSteps: 50,
      connectedSdkSession: null,
      actionTimelineDocked: 'right',
    });

    useChatStore.setState({
      threadStateById: {
        [selectedThreadId]: {
          threadId: selectedThreadId,
          messages: [],
          mode: 'chat',
          isProcessing: false,
          activeMention: null,
          inputDraft: '',
        },
      },
      getThreadState: vi.fn((threadId?: string | null) => {
        const resolvedThreadId = threadId ?? selectedThreadId;
        return {
          threadId: resolvedThreadId,
          messages: [],
          mode: 'chat',
          isProcessing: false,
          activeMention: null,
          inputDraft: '',
        };
      }),
      sendMessage: vi.fn(),
      appendStreamChunk: vi.fn(),
      completeStream: vi.fn(),
      addToolCall: vi.fn(),
      updateToolCall: vi.fn(),
      clearMessages: vi.fn(),
      setMode: vi.fn(),
      setActiveMention: vi.fn(),
      setInputDraft: vi.fn(),
    });

    useBrowserActionStore.setState({
      actions: [],
      currentSessionId: null,
      isAutomationActive: false,
      maxActions: 500,
      activeActions: vi.fn(() => []),
      getSessionActions: vi.fn(() => []),
      latestScreenshot: vi.fn(),
      pushAction: vi.fn(),
      updateAction: vi.fn(),
      clearActions: vi.fn(),
      clearSessionActions: vi.fn(),
      setSession: vi.fn(),
    });
  });

  it('shows an explicit placeholder configuration message when Graph is not configured', () => {
    graphState.configured = false;

    const { unmount } = render(<CopilotSidebar />);

    expect(screen.getByText('Graph widgets are not configured')).toBeInTheDocument();
    expect(screen.getByText(/placeholder Entra client ID/i)).toBeInTheDocument();
    expect(graphClientMock.getMe).not.toHaveBeenCalled();
    expect(graphClientMock.listCalendarEvents).not.toHaveBeenCalled();
  });

  it('shows a sign-in message when Graph is configured but the user is not authenticated', () => {
    render(<CopilotSidebar />);

    expect(screen.getByText('Sign in to load Graph widgets')).toBeInTheDocument();
    expect(screen.getByText(/Connect your Entra account/i)).toBeInTheDocument();
    expect(graphClientMock.getMe).not.toHaveBeenCalled();
    expect(graphClientMock.listMailMessages).not.toHaveBeenCalled();
  });

  it('loads and renders Graph profile, calendar, files, and mail summaries', async () => {
    useAppStore.setState({ isAuthenticated: true });

    const laterToday = new Date();
    laterToday.setHours(laterToday.getHours() + 1);

    graphClientMock.getMe.mockResolvedValue({
      id: 'user-1',
      displayName: 'Adele Vance',
      mail: 'adele@contoso.com',
      jobTitle: 'Director of Operations',
      officeLocation: 'Building 34',
    });
    graphClientMock.listCalendarEvents.mockResolvedValue({
      value: [
        {
          id: 'event-1',
          subject: 'Quarterly business review',
          start: { dateTime: laterToday.toISOString() },
          location: { displayName: 'Teams' },
        },
      ],
    });
    graphClientMock.listRecentDriveFiles.mockResolvedValue({
      value: [
        {
          id: 'file-1',
          name: 'Q4 Plan.docx',
          webUrl: 'https://contoso.sharepoint.com/q4-plan',
          lastModifiedDateTime: new Date().toISOString(),
        },
      ],
    });
    graphClientMock.listMailMessages.mockResolvedValue({
      value: [
        {
          id: 'mail-1',
          subject: 'Budget review',
          bodyPreview: 'Please send your updated numbers by 3 PM.',
          from: {
            emailAddress: {
              displayName: 'Megan Bowen',
            },
          },
          webLink: 'https://outlook.office.com/mail/budget-review',
        },
      ],
    });

    render(<CopilotSidebar />);

    expect(await screen.findByText('Adele Vance')).toBeInTheDocument();
    expect(screen.getByText('adele@contoso.com')).toBeInTheDocument();
    expect(screen.getByText('Quarterly business review')).toBeInTheDocument();
    expect(screen.getByText('Q4 Plan.docx')).toBeInTheDocument();
    expect(screen.getByText('Budget review')).toBeInTheDocument();

    await waitFor(() => {
      expect(graphClientMock.getMe).toHaveBeenCalledTimes(1);
      expect(graphClientMock.listCalendarEvents).toHaveBeenCalledWith(
        expect.objectContaining({ top: 6, signal: expect.any(AbortSignal) }),
      );
      expect(graphClientMock.listRecentDriveFiles).toHaveBeenCalledWith(
        expect.objectContaining({ top: 3, signal: expect.any(AbortSignal) }),
      );
      expect(graphClientMock.listMailMessages).toHaveBeenCalledWith(
        expect.objectContaining({ top: 3, unreadOnly: true, signal: expect.any(AbortSignal) }),
      );
    });
  });

  it('aborts in-flight widget requests when the sidebar unmounts', () => {
    useAppStore.setState({ isAuthenticated: true });

    graphClientMock.getMe.mockImplementation(() => new Promise(() => {}));
    graphClientMock.listCalendarEvents.mockImplementation(() => new Promise(() => {}));
    graphClientMock.listRecentDriveFiles.mockImplementation(() => new Promise(() => {}));
    graphClientMock.listMailMessages.mockImplementation(() => new Promise(() => {}));

    const { unmount } = render(<CopilotSidebar />);

    const calendarSignal = graphClientMock.listCalendarEvents.mock.calls[0]?.[0]?.signal as AbortSignal | undefined;
    const filesSignal = graphClientMock.listRecentDriveFiles.mock.calls[0]?.[0]?.signal as AbortSignal | undefined;
    const mailSignal = graphClientMock.listMailMessages.mock.calls[0]?.[0]?.signal as AbortSignal | undefined;

    expect(calendarSignal).toBeInstanceOf(AbortSignal);
    expect(filesSignal).toBeInstanceOf(AbortSignal);
    expect(mailSignal).toBeInstanceOf(AbortSignal);

    unmount();

    expect(calendarSignal?.aborted).toBe(true);
    expect(filesSignal?.aborted).toBe(true);
    expect(mailSignal?.aborted).toBe(true);
  });
});

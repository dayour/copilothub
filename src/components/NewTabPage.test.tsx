import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NewTabPage } from './NewTabPage';
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
      title: 'Browser',
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

describe('NewTabPage', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: makeTabs() });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders CopilotHub branding', () => {
    render(<NewTabPage tabId="test-tab-1" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CopilotHub');
  });

  it('renders search input', () => {
    render(<NewTabPage tabId="test-tab-1" />);
    expect(screen.getByRole('textbox', { name: 'New tab address input' })).toBeInTheDocument();
  });

  it('quick action buttons present', () => {
    render(<NewTabPage tabId="test-tab-1" />);
    expect(screen.getByRole('button', { name: 'Open Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VS Code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Runbooks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copilot Studio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Power Platform' })).toBeInTheDocument();
  });

  it('open chat button activates chat tab', () => {
    const setActiveSpy = vi.spyOn(useTabStore.getState(), 'setActiveTab');
    render(<NewTabPage tabId="test-tab-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Chat' }));

    expect(setActiveSpy).toHaveBeenCalledWith('chat-tab');
  });

  it('new terminal button adds tab', () => {
    const countBefore = useTabStore.getState().tabs.length;
    render(<NewTabPage tabId="test-tab-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Terminal' }));

    const tabsAfter = useTabStore.getState().tabs;
    expect(tabsAfter.length).toBe(countBefore + 1);
    expect(tabsAfter.at(-1)?.type).toBe('terminal');
  });

  it('Copilot Studio quick action adds the panel tab', () => {
    render(<NewTabPage tabId="test-tab-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Copilot Studio' }));

    expect(useTabStore.getState().tabs.at(-1)?.type).toBe('copilot-studio');
  });

  it('Power Platform quick action adds the panel tab', () => {
    render(<NewTabPage tabId="test-tab-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Power Platform' }));

    expect(useTabStore.getState().tabs.at(-1)?.type).toBe('power-platform');
  });

  it('tips strip renders', () => {
    render(<NewTabPage tabId="test-tab-1" />);
    expect(screen.getByText(/control the browser/i)).toBeInTheDocument();
  });
});


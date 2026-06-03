import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddressBar } from './AddressBar';
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
      url: 'https://copilot.microsoft.com',
      favicon: '',
      isActive: true,
      isPinned: false,
      historyStack: ['https://copilot.microsoft.com'],
      historyIndex: 0,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    },
  ];
}

describe('AddressBar', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: makeTabs() });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when active tab is chat', () => {
    useTabStore.setState((state) => ({
      tabs: state.tabs.map((tab) => ({
        ...tab,
        isActive: tab.type === 'chat',
      })),
    }));

    render(<AddressBar />);

    expect(screen.queryByRole('textbox', { name: 'Address bar' })).not.toBeInTheDocument();
  });

  it('renders when active tab is browser', () => {
    render(<AddressBar />);
    expect(screen.getByRole('textbox', { name: 'Address bar' })).toBeInTheDocument();
  });

  it('does not render for Microsoft tabs in browser-host mode', () => {
    useTabStore.setState({
      tabs: [
        makeTabs()[0],
        {
          ...makeTabs()[1],
          id: 'power-platform-tab',
          type: 'power-platform',
          title: 'Power Platform',
          url: 'https://make.powerapps.com',
        },
      ],
    });

    render(<AddressBar />);

    expect(screen.queryByRole('textbox', { name: 'Address bar' })).not.toBeInTheDocument();
  });

  it('shows current tab URL in input', () => {
    render(<AddressBar />);
    const input = screen.getByRole('textbox', { name: 'Address bar' });
    expect(input).toHaveValue('https://copilot.microsoft.com');
  });

  it('submit URL calls updateTabUrl with normalized value', () => {
    render(<AddressBar />);
    const input = screen.getByRole('textbox', { name: 'Address bar' });

    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const browserTab = useTabStore.getState().tabs.find((tab) => tab.id === 'browser-tab');
    expect(browserTab?.url).toBe('https://example.com');
  });

  it('refresh button emits a reload signal for browser-host tabs', () => {
    render(<AddressBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    const browserTab = useTabStore.getState().tabs.find((tab) => tab.id === 'browser-tab');
    expect(browserTab?.reloadNonce).toBe(1);
    expect(browserTab?.isLoading).toBe(true);
  });

  it('back button disabled when canGoBack is false', () => {
    render(<AddressBar />);
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
  });

  it('escape reverts input to current URL', () => {
    render(<AddressBar />);
    const input = screen.getByRole('textbox', { name: 'Address bar' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'not-final-url' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input).toHaveValue('https://copilot.microsoft.com');
  });

  it('does not render the external browser link for unsafe protocols', () => {
    useTabStore.setState({
      tabs: [
        makeTabs()[0],
        {
          ...makeTabs()[1],
          url: 'javascript:alert(1)',
        },
      ],
    });

    render(<AddressBar />);

    expect(screen.queryByRole('link', { name: 'Open in external browser' })).not.toBeInTheDocument();
  });

  it('renders the external browser link for safe web protocols', () => {
    render(<AddressBar />);

    expect(screen.getByRole('link', { name: 'Open in external browser' })).toHaveAttribute(
      'href',
      'https://copilot.microsoft.com',
    );
  });
});

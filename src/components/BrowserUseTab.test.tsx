import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserUseTab } from './BrowserUseTab';
import { useBrowserActionStore } from '../store/browserActionStore';

const mcpClientMock = vi.hoisted(() => ({
  navigate: vi.fn(),
  screenshot: vi.fn(),
  callTool: vi.fn(),
}));

vi.mock('../lib/mcpClient', () => ({
  default: mcpClientMock,
}));

describe('BrowserUseTab', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    mcpClientMock.navigate.mockReset();
    mcpClientMock.screenshot.mockReset();
    mcpClientMock.callTool.mockReset();
    useBrowserActionStore.setState({
      actions: [],
      currentSessionId: null,
      isAutomationActive: false,
      maxActions: 500,
    });
  });

  it('records a Pick & Polish intent after observing the current UI layer', async () => {
    mcpClientMock.callTool.mockResolvedValue({
      success: true,
      content: 'observed UI',
      error: undefined,
      isError: false,
    });

    render(<BrowserUseTab isActive />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick and polish current UI layer' }));

    await waitFor(() => {
      expect(mcpClientMock.callTool).toHaveBeenCalledWith(
        'browser_observe',
        {},
        { targetSessionId: undefined },
      );
    });

    const action = useBrowserActionStore.getState().actions.find((candidate) => (
      candidate.toolName === 'browser_pick_polish'
    ));
    expect(action?.status).toBe('completed');
    expect(action?.type).toBe('polish');
    expect(action?.result).toContain('observed UI');
  });

  it('keeps Pick & Polish failure visible when the browser sidecar is unavailable', async () => {
    mcpClientMock.callTool.mockResolvedValue({
      success: false,
      content: '',
      error: 'sidecar unavailable',
      isError: true,
    });

    render(<BrowserUseTab isActive />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick and polish current UI layer' }));

    await waitFor(() => {
      expect(screen.getByText(/needs a connected browser sidecar/i)).toBeInTheDocument();
    });

    const action = useBrowserActionStore.getState().actions.find((candidate) => (
      candidate.toolName === 'browser_pick_polish'
    ));
    expect(action?.status).toBe('error');
    expect(action?.error).toBe('sidecar unavailable');
  });
});

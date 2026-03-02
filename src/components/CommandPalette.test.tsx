// ---------------------------------------------------------------------------
// CommandPalette.test.tsx -- Component tests for CommandPalette
// Uses @testing-library/react with vitest + jsdom. Zustand stores are
// manipulated directly via setState for deterministic test setup.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';
import { useAppStore } from '../store/appStore';
import { useTabStore } from '../store/tabStore';

// jsdom does not implement scrollIntoView -- stub it to prevent runtime errors
// when the component tries to scroll selected items into view.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ---------------------------------------------------------------------------
// Store reset helpers
// ---------------------------------------------------------------------------

/** Reset appStore to default values before each test. */
function resetAppStore(overrides: Partial<ReturnType<typeof useAppStore.getState>> = {}) {
  useAppStore.setState({
    theme: 'dark',
    sidebarPosition: 'left',
    verticalTabsEnabled: false,
    sidecarStatus: 'stopped',
    commandPaletteOpen: false,
    copilotSidebarOpen: false,
    isAuthenticated: false,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommandPalette', () => {
  beforeEach(() => {
    resetAppStore();
  });

  // -------------------------------------------------------------------------
  // 1. Does not render when closed
  // -------------------------------------------------------------------------
  it('does not render when commandPaletteOpen is false', () => {
    resetAppStore({ commandPaletteOpen: false });
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 2. Renders when open
  // -------------------------------------------------------------------------
  it('renders dialog when commandPaletteOpen is true', () => {
    resetAppStore({ commandPaletteOpen: true });
    render(<CommandPalette />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Search input auto-focuses
  // The component uses requestAnimationFrame to defer focus, so we use
  // waitFor to allow the callback to fire in jsdom.
  // -------------------------------------------------------------------------
  it('auto-focuses the search input when open', async () => {
    resetAppStore({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Type a command...');
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Filters commands by search query
  // -------------------------------------------------------------------------
  it('filters commands when user types in search', () => {
    resetAppStore({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Type a command...');
    fireEvent.change(input, { target: { value: 'terminal' } });

    // "New Terminal Tab" should be visible
    expect(screen.getByText('New Terminal Tab')).toBeInTheDocument();
    // Other unrelated commands should not be visible
    expect(screen.queryByText('New Browser Tab')).not.toBeInTheDocument();
    expect(screen.queryByText('Toggle Copilot Sidebar')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Escape key closes the palette
  // toggleCommandPalette flips the boolean, so after pressing Escape the
  // store should reflect commandPaletteOpen === false.
  // -------------------------------------------------------------------------
  it('closes palette when Escape is pressed', () => {
    resetAppStore({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. Executing a command (click "New Browser Tab")
  // Verifies that addTab was called and the palette closes.
  // -------------------------------------------------------------------------
  it('executes command and closes palette when a command is clicked', () => {
    resetAppStore({ commandPaletteOpen: true });

    const tabCountBefore = useTabStore.getState().tabs.length;

    render(<CommandPalette />);

    // Click the "New Browser Tab" command button
    const button = screen.getByText('New Browser Tab');
    fireEvent.click(button);

    // A new browser tab should have been added
    const tabsAfter = useTabStore.getState().tabs;
    expect(tabsAfter.length).toBe(tabCountBefore + 1);

    // The newest tab (last in the array) should be a browser tab
    const newestTab = tabsAfter[tabsAfter.length - 1];
    expect(newestTab.type).toBe('browser');
    expect(newestTab.isActive).toBe(true);

    // Palette should be closed after command execution
    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Bonus: shows "No matching commands" for garbage input
  // -------------------------------------------------------------------------
  it('shows empty state when no commands match search', () => {
    resetAppStore({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText('Type a command...');
    fireEvent.change(input, { target: { value: 'xyznonexistent999' } });

    expect(screen.getByText('No matching commands')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Bonus: backdrop click closes the palette
  // -------------------------------------------------------------------------
  it('closes palette when backdrop is clicked', () => {
    resetAppStore({ commandPaletteOpen: true });
    const { container } = render(<CommandPalette />);

    // The backdrop is the first child div with aria-hidden="true"
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
  });
});

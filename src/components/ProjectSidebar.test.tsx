import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readDir } from '@tauri-apps/plugin-fs';
import { ProjectSidebar } from './ProjectSidebar';
import { useAppStore } from '../store/appStore';
import { useTabStore, type Tab } from '../store/tabStore';

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

describe('ProjectSidebar', () => {
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
      copilotSidebarOpen: false,
      showActionOverlay: true,
      browserUseAutoScreenshot: true,
      browserUseMaxSteps: 50,
      connectedSdkSession: null,
      actionTimelineDocked: 'right',
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
          isActive: true,
          historyStack: ['about:blank'],
          historyIndex: 0,
        }),
      ],
    });
  });

  it('shows placeholder workspace state when no project is selected', () => {
    render(<ProjectSidebar onAddProject={vi.fn()} />);

    expect(screen.getAllByText('No workspace selected')).toHaveLength(2);
    expect(screen.getByText('No recent projects yet.')).toBeInTheDocument();
    expect(screen.getByText('Select a project to browse its files.')).toBeInTheDocument();
  });

  it('calls the add project handler when the action button is pressed', () => {
    const onAddProject = vi.fn();
    render(<ProjectSidebar onAddProject={onAddProject} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));

    expect(onAddProject).toHaveBeenCalledTimes(1);
  });

  it('renders quick launch actions including terminal access', () => {
    render(<ProjectSidebar onAddProject={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Open Browser' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Terminal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open VS Code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Runbooks' })).toBeInTheDocument();
  });

  it('opens a terminal tab from the quick launch section', () => {
    render(<ProjectSidebar onAddProject={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Terminal' }));

    expect(useTabStore.getState().tabs.at(-1)?.type).toBe('terminal');
  });

  it('loads and renders the workspace tree for the active project', async () => {
    useAppStore.getState().setCurrentProject('C:/Work/Alpha');
    vi.mocked(readDir)
      .mockResolvedValueOnce([
        { name: 'src', isDirectory: true, isFile: false, isSymlink: false },
        { name: 'README.md', isDirectory: false, isFile: true, isSymlink: false },
      ])
      .mockResolvedValueOnce([
        { name: 'App.tsx', isDirectory: false, isFile: true, isSymlink: false },
      ]);

    render(<ProjectSidebar onAddProject={vi.fn()} />);

    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0);
    expect(await screen.findByText('README.md')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand src' }));

    await waitFor(() => {
      expect(screen.getByText('App.tsx')).toBeInTheDocument();
    });
  });

  it('collapses the sidebar and stores the collapsed state', () => {
    render(<ProjectSidebar onAddProject={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse project sidebar' }));

    expect(useAppStore.getState().projectSidebarCollapsed).toBe(true);
    expect(screen.queryByText('Current Workspace')).not.toBeInTheDocument();
  });
});

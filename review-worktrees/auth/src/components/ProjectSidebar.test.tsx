import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readDir } from '@tauri-apps/plugin-fs';
import { ProjectSidebar } from './ProjectSidebar';
import { useAppStore } from '../store/appStore';

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

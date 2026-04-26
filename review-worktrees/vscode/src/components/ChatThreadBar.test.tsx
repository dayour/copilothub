import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatThreadBar } from './ChatThreadBar';
import { useAppStore } from '../store/appStore';
import { useSessionEnvironmentStore } from '../store/sessionEnvironmentStore';
import { createDefaultSessionEnvironment } from '../lib/sessionEnvironment';
import {
  createSessionThread,
  getDefaultThreadTitle,
} from '../lib/sessionThread';

function seedState() {
  const session = createDefaultSessionEnvironment('E:\\copilothub');
  const thread = createSessionThread({
    projectPath: session.projectPath,
    sessionEnvironmentId: session.id,
    title: getDefaultThreadTitle(session.projectPath),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });

  useSessionEnvironmentStore.setState({
    sessions: [session],
    selectedSessionId: session.id,
    threads: [thread],
    selectedThreadId: thread.id,
  });

  useAppStore.setState({
    theme: 'dark',
    sidebarPosition: 'left',
    verticalTabsEnabled: false,
    projectSidebarCollapsed: false,
    currentProjectPath: 'E:\\copilothub',
    recentProjects: ['E:\\copilothub'],
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
}

describe('ChatThreadBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedState();
  });

  it('creates and selects a new thread from the UI', () => {
    render(<ChatThreadBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Create thread' }));

    const state = useSessionEnvironmentStore.getState();
    expect(state.threads).toHaveLength(2);
    expect(state.selectedThread()?.title).toBe('Thread 2');
    expect(screen.getByText(/2 threads/)).toBeInTheDocument();
  });

  it('selects another thread when its chip is clicked', () => {
    const secondThread = useSessionEnvironmentStore.getState().createThread({
      projectPath: 'E:\\copilothub',
      title: 'Review Thread',
    });

    render(<ChatThreadBar />);

    fireEvent.click(screen.getByRole('button', { name: 'copilothub Main' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review Thread' }));

    expect(useSessionEnvironmentStore.getState().selectedThreadId).toBe(secondThread.id);
  });

  it('renames the active thread inline', () => {
    render(<ChatThreadBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename thread copilothub Main' }));
    const input = screen.getByLabelText('Rename copilothub Main');

    fireEvent.change(input, { target: { value: 'Planning Thread' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useSessionEnvironmentStore.getState().selectedThread()?.title).toBe('Planning Thread');
    expect(screen.getByRole('button', { name: 'Planning Thread' })).toBeInTheDocument();
  });
});

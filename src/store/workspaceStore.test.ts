import { beforeEach, describe, expect, it } from 'vitest';
import { useTabStore, type Tab } from './tabStore';
import { useWorkspaceStore, type Workspace } from './workspaceStore';

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
      title: 'Docs',
      url: 'https://b.example',
      favicon: '',
      isActive: true,
      isPinned: false,
      historyStack: ['https://a.example', 'https://b.example'],
      historyIndex: 1,
      reloadNonce: 4,
      isLoading: false,
      canGoBack: true,
      canGoForward: false,
    },
  ];
}

function makeWorkspace(id: string, tabs: Workspace['tabs']): Workspace {
  return {
    id,
    name: id,
    color: '#0078d4',
    tabs,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('workspaceStore', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: makeTabs() });
    useWorkspaceStore.setState({
      workspaces: [
        makeWorkspace('source', []),
        makeWorkspace('target', [
          {
            type: 'browser',
            title: 'Restored docs',
            url: 'https://b.example',
            favicon: '',
            isPinned: false,
            isActive: true,
            historyStack: ['https://a.example', 'https://b.example', 'https://c.example'],
            historyIndex: 1,
            reloadNonce: 7,
          },
        ]),
      ],
      activeWorkspaceId: 'source',
      isRecording: false,
      recordingStartedAt: null,
      snapshotFlash: false,
    });
  });

  it('switchWorkspace restores active tab, history, and reload metadata', () => {
    useWorkspaceStore.getState().switchWorkspace('target');

    const activeTab = useTabStore.getState().activeTab();
    expect(activeTab?.title).toBe('Restored docs');
    expect(activeTab?.url).toBe('https://b.example');
    expect(activeTab?.historyStack).toEqual([
      'https://a.example',
      'https://b.example',
      'https://c.example',
    ]);
    expect(activeTab?.historyIndex).toBe(1);
    expect(activeTab?.canGoBack).toBe(true);
    expect(activeTab?.canGoForward).toBe(true);
    expect(activeTab?.reloadNonce).toBe(7);
  });

  it('switchWorkspace tolerates older saved tabs without history metadata', () => {
    useWorkspaceStore.setState({
      workspaces: [
        makeWorkspace('source', []),
        makeWorkspace('target', [
          {
            type: 'browser',
            title: 'Legacy docs',
            url: 'https://legacy.example',
            favicon: '',
            isPinned: false,
          },
        ]),
      ],
      activeWorkspaceId: 'source',
    });

    useWorkspaceStore.getState().switchWorkspace('target');

    const activeTab = useTabStore.getState().activeTab();
    expect(activeTab?.title).toBe('Legacy docs');
    expect(activeTab?.historyStack).toEqual(['https://legacy.example']);
    expect(activeTab?.historyIndex).toBe(0);
  });
});

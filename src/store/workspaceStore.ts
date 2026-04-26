// ---------------------------------------------------------------------------
// workspaceStore.ts -- Zustand store for workspace management in CopilotHub
// Manages named tab collections, Edge import, recording, and snapshots.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { useTabStore, type TabType } from './tabStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedTab {
  type: TabType;
  title: string;
  url: string;
  favicon: string;
  isPinned: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  tabs: SavedTab[];
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WORKSPACE_COLORS = [
  { name: 'Blue', value: '#0078d4' },
  { name: 'Purple', value: '#8764b8' },
  { name: 'Teal', value: '#00b7c3' },
  { name: 'Pink', value: '#e3008c' },
  { name: 'Orange', value: '#ff8c00' },
  { name: 'Red', value: '#d13438' },
  { name: 'Green', value: '#038387' },
  { name: 'Gray', value: '#69797e' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _wsIdCounter = 0;
function nextWorkspaceId(): string {
  _wsIdCounter += 1;
  return `ws-${_wsIdCounter}-${Date.now()}`;
}

function snapshotCurrentTabs(): SavedTab[] {
  const tabs = useTabStore.getState().tabs;
  return tabs.map((t) => ({
    type: t.type,
    title: t.title,
    url: t.url,
    favicon: t.favicon,
    isPinned: t.isPinned,
  }));
}

function restoreTabsFromSnapshot(saved: SavedTab[]): void {
  const store = useTabStore.getState();

  // Close all existing tabs except the pinned chat tab
  const toClose = store.tabs.filter(
    (t) => !(t.isPinned && t.type === 'chat'),
  );
  for (const tab of toClose) {
    store.closeTab(tab.id);
  }

  // If no saved tabs, open a blank browser tab
  if (saved.length === 0) {
    store.addTab('browser');
    return;
  }

  // Restore saved tabs (skip chat tabs -- the persistent one already exists)
  let first = true;
  for (const s of saved) {
    if (s.type === 'chat' && s.isPinned) continue;
    store.addTab(s.type, s.url || undefined);

    // The newly added tab is now active; update its title and favicon
    const latest = useTabStore.getState();
    const newest = latest.tabs[latest.tabs.length - 1];
    if (newest) {
      latest.updateTabTitle(newest.id, s.title);
      if (s.favicon) latest.updateTabFavicon(newest.id, s.favicon);
      if (s.isPinned) latest.pinTab(newest.id);

      // Activate the first restored tab
      if (first) {
        latest.setActiveTab(newest.id);
        first = false;
      }
    }
  }
}

function createDefaultWorkspace(): Workspace {
  return {
    id: nextWorkspaceId(),
    name: 'Default',
    color: WORKSPACE_COLORS[0].value,
    tabs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isRecording: boolean;
  recordingStartedAt: number | null;
  snapshotFlash: boolean;

  // Workspace actions
  createWorkspace: (name: string, color?: string) => string;
  switchWorkspace: (id: string) => void;
  saveCurrentAsWorkspace: (name: string, color?: string) => string;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setWorkspaceColor: (id: string, color: string) => void;
  updateActiveWorkspaceTabs: () => void;
  importAsWorkspace: (
    name: string,
    bookmarks: { title: string; url: string }[],
    color?: string,
  ) => string;

  // Record / snapshot
  toggleRecording: () => void;
  triggerSnapshot: () => void;
  clearSnapshotFlash: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    immer((set, get) => {
      const defaultWs = createDefaultWorkspace();

      return {
        workspaces: [defaultWs],
        activeWorkspaceId: defaultWs.id,
        isRecording: false,
        recordingStartedAt: null,
        snapshotFlash: false,

        // -- Workspace actions ------------------------------------------------

        createWorkspace: (name: string, color?: string) => {
          const id = nextWorkspaceId();
          set((state) => {
            state.workspaces.push({
              id,
              name,
              color: color ?? WORKSPACE_COLORS[state.workspaces.length % WORKSPACE_COLORS.length].value,
              tabs: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          });

          // Switch to the new workspace immediately
          get().switchWorkspace(id);
          return id;
        },

        switchWorkspace: (id: string) => {
          const state = get();
          if (state.activeWorkspaceId === id) return;

          const target = state.workspaces.find((w) => w.id === id);
          if (!target) return;

          // Save current tabs to outgoing workspace
          set((draft) => {
            const outgoing = draft.workspaces.find(
              (w) => w.id === draft.activeWorkspaceId,
            );
            if (outgoing) {
              outgoing.tabs = snapshotCurrentTabs();
              outgoing.updatedAt = Date.now();
            }
            draft.activeWorkspaceId = id;
          });

          // Restore tabs from target workspace
          restoreTabsFromSnapshot(target.tabs);
        },

        saveCurrentAsWorkspace: (name: string, color?: string) => {
          const id = nextWorkspaceId();
          const tabs = snapshotCurrentTabs();
          set((state) => {
            state.workspaces.push({
              id,
              name,
              color: color ?? WORKSPACE_COLORS[state.workspaces.length % WORKSPACE_COLORS.length].value,
              tabs,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            // Save outgoing workspace tabs first
            const outgoing = state.workspaces.find(
              (w) => w.id === state.activeWorkspaceId,
            );
            if (outgoing) {
              outgoing.tabs = tabs;
              outgoing.updatedAt = Date.now();
            }
            state.activeWorkspaceId = id;
          });
          return id;
        },

        deleteWorkspace: (id: string) => {
          const state = get();
          // Cannot delete the last workspace
          if (state.workspaces.length <= 1) return;

          const wasActive = state.activeWorkspaceId === id;

          set((draft) => {
            draft.workspaces = draft.workspaces.filter((w) => w.id !== id);
            if (wasActive && draft.workspaces.length > 0) {
              draft.activeWorkspaceId = draft.workspaces[0].id;
            }
          });

          // If we deleted the active workspace, restore the new active one
          if (wasActive) {
            const newActive = get().workspaces[0];
            if (newActive) {
              restoreTabsFromSnapshot(newActive.tabs);
            }
          }
        },

        renameWorkspace: (id: string, name: string) => {
          set((state) => {
            const ws = state.workspaces.find((w) => w.id === id);
            if (ws) {
              ws.name = name;
              ws.updatedAt = Date.now();
            }
          });
        },

        setWorkspaceColor: (id: string, color: string) => {
          set((state) => {
            const ws = state.workspaces.find((w) => w.id === id);
            if (ws) {
              ws.color = color;
              ws.updatedAt = Date.now();
            }
          });
        },

        updateActiveWorkspaceTabs: () => {
          set((state) => {
            const ws = state.workspaces.find(
              (w) => w.id === state.activeWorkspaceId,
            );
            if (ws) {
              ws.tabs = snapshotCurrentTabs();
              ws.updatedAt = Date.now();
            }
          });
        },

        importAsWorkspace: (
          name: string,
          bookmarks: { title: string; url: string }[],
          color?: string,
        ) => {
          const id = nextWorkspaceId();
          const tabs: SavedTab[] = bookmarks.map((b) => ({
            type: 'browser' as TabType,
            title: b.title,
            url: b.url,
            favicon: '',
            isPinned: false,
          }));

          set((state) => {
            state.workspaces.push({
              id,
              name,
              color: color ?? WORKSPACE_COLORS[state.workspaces.length % WORKSPACE_COLORS.length].value,
              tabs,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          });
          return id;
        },

        // -- Record / snapshot ------------------------------------------------

        toggleRecording: () => {
          set((state) => {
            if (state.isRecording) {
              state.isRecording = false;
              state.recordingStartedAt = null;
            } else {
              state.isRecording = true;
              state.recordingStartedAt = Date.now();
            }
          });
        },

        triggerSnapshot: () => {
          set((state) => {
            state.snapshotFlash = true;
          });
          // Auto-clear flash after animation completes
          setTimeout(() => {
            get().clearSnapshotFlash();
          }, 400);
        },

        clearSnapshotFlash: () => {
          set((state) => {
            state.snapshotFlash = false;
          });
        },
      };
    }),
    {
      name: 'copilothub-workspaces',
      // Only persist workspace data, not transient UI state
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// browserActionStore.ts -- Zustand store for real-time browser automation
// actions in CopilotHub. Tracks MCP sidecar tool invocations, their status,
// results, and screenshots from the copilotbrowser automation layer.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BrowserActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'screenshot'
  | 'snapshot'
  | 'evaluate'
  | 'scroll'
  | 'wait'
  | 'multi-action'
  | 'observe'
  | 'follow-me'
  | 'hover'
  | 'select-option'
  | 'drag'
  | 'press-key'
  | 'fill-form'
  | 'tabs'
  | 'other';

export interface BrowserAction {
  id: string;
  type: BrowserActionType;
  toolName: string;
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  args: Record<string, unknown>;
  result?: string;
  error?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  screenshotUrl?: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface BrowserActionStore {
  // -- State --
  actions: BrowserAction[];
  currentSessionId: string | null;
  isAutomationActive: boolean;
  maxActions: number;

  // -- Computed accessors --
  activeActions: () => BrowserAction[];
  getSessionActions: (sessionId: string) => BrowserAction[];
  latestScreenshot: () => BrowserAction | undefined;

  // -- Actions --
  pushAction: (
    action: Omit<BrowserAction, 'id' | 'timestamp' | 'startTime'>,
  ) => void;
  updateAction: (
    id: string,
    updates: Partial<
      Pick<
        BrowserAction,
        'status' | 'result' | 'error' | 'endTime' | 'duration' | 'screenshotUrl'
      >
    >,
  ) => void;
  clearActions: () => void;
  clearSessionActions: (sessionId: string) => void;
  setSession: (sessionId: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map an MCP tool name (e.g. "browser_navigate") to a BrowserActionType. */
export function toolNameToActionType(toolName: string): BrowserActionType {
  const mapping: Record<string, BrowserActionType> = {
    browser_navigate: 'navigate',
    browser_click: 'click',
    browser_type: 'type',
    browser_take_screenshot: 'screenshot',
    browser_snapshot: 'snapshot',
    browser_evaluate: 'evaluate',
    browser_scroll: 'scroll',
    browser_scroll_to_element: 'scroll',
    browser_wait_for: 'wait',
    browser_multi_action: 'multi-action',
    browser_observe: 'observe',
    browser_follow_me_start: 'follow-me',
    browser_follow_me_stop: 'follow-me',
    browser_follow_me_replay: 'follow-me',
    browser_hover: 'hover',
    browser_select_option: 'select-option',
    browser_drag: 'drag',
    browser_press_key: 'press-key',
    browser_fill_form: 'fill-form',
    browser_tabs: 'tabs',
  };

  return mapping[toolName] ?? 'other';
}

/** Revoke blob URLs on actions that carry screenshot data. */
function revokeBlobUrls(actions: BrowserAction[]): void {
  for (const action of actions) {
    if (action.screenshotUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(action.screenshotUrl);
    }
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBrowserActionStore = create<BrowserActionStore>()(
  immer((set, get) => ({
    // -- State ---------------------------------------------------------------
    actions: [],
    currentSessionId: null,
    isAutomationActive: false,
    maxActions: 500,

    // -- Computed accessors --------------------------------------------------
    activeActions: () =>
      get().actions.filter(
        (a) => a.status === 'pending' || a.status === 'running',
      ),

    getSessionActions: (sessionId: string) =>
      get().actions.filter((a) => a.sessionId === sessionId),

    latestScreenshot: () => {
      const withScreenshot = get().actions.filter((a) => a.screenshotUrl);
      return withScreenshot.length > 0
        ? withScreenshot[withScreenshot.length - 1]
        : undefined;
    },

    // -- Actions -------------------------------------------------------------

    pushAction: (action) => {
      set((state) => {
        const now = Date.now();
        const newAction: BrowserAction = {
          ...action,
          id: crypto.randomUUID(),
          timestamp: now,
          startTime: now,
        };
        state.actions.push(newAction);

        // Evict if over capacity -- prefer removing oldest completed first
        while (state.actions.length > state.maxActions) {
          const completedIdx = state.actions.findIndex(
            (a) =>
              a.status === 'completed' || a.status === 'error',
          );
          if (completedIdx !== -1) {
            const [evicted] = state.actions.splice(completedIdx, 1);
            if (evicted.screenshotUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(evicted.screenshotUrl);
            }
          } else {
            // Fall back to evicting oldest pending
            const [evicted] = state.actions.splice(0, 1);
            if (evicted.screenshotUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(evicted.screenshotUrl);
            }
          }
        }

        state.isAutomationActive = true;
      });
    },

    updateAction: (id, updates) => {
      set((state) => {
        const action = state.actions.find((a) => a.id === id);
        if (!action) return;

        Object.assign(action, updates);

        // Auto-set endTime and duration on terminal statuses
        if (
          updates.status === 'completed' ||
          updates.status === 'error'
        ) {
          if (!action.endTime) {
            action.endTime = Date.now();
          }
          action.duration = action.endTime - action.startTime;
        }

        // Deactivate automation when nothing is pending/running
        const stillActive = state.actions.some(
          (a) => a.status === 'pending' || a.status === 'running',
        );
        if (!stillActive) {
          state.isAutomationActive = false;
        }
      });
    },

    clearActions: () => {
      set((state) => {
        revokeBlobUrls(state.actions);
        state.actions = [];
        state.isAutomationActive = false;
      });
    },

    clearSessionActions: (sessionId: string) => {
      set((state) => {
        const toRemove = state.actions.filter(
          (a) => a.sessionId === sessionId,
        );
        revokeBlobUrls(toRemove);
        state.actions = state.actions.filter(
          (a) => a.sessionId !== sessionId,
        );
      });
    },

    setSession: (sessionId: string | null) => {
      set((state) => {
        state.currentSessionId = sessionId;
      });
    },
  })),
);

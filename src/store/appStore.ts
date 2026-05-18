// ---------------------------------------------------------------------------
// appStore.ts -- Zustand store for global application state in CopilotHub
// Manages theme, layout preferences, sidecar status, and UI toggles.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  applySessionExecutionSelectionChange,
  type SessionSandboxMode,
  type SessionShellType,
} from '../lib/sessionEnvironment';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'dark' | 'light' | 'enterprise-blue' | 'system';

export type SidebarPosition = 'left' | 'right' | 'hidden';

export type SidecarStatus = 'stopped' | 'starting' | 'running' | 'error';

export type ActionTimelinePosition = 'right' | 'bottom' | 'hidden';

export type EditorPreference = 'vscode' | 'browser';

export type ApprovalPolicy = 'on-request' | 'on-failure' | 'untrusted-only';
export type AssistantPaneMode = 'copilot' | 'review';

const MIN_BROWSER_USE_STEPS = 1;
const MAX_BROWSER_USE_STEPS = 200;

function clampBrowserUseMaxSteps(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(MAX_BROWSER_USE_STEPS, Math.max(MIN_BROWSER_USE_STEPS, Math.round(value)));
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface AppStore {
  // -- State --
  theme: Theme;
  sidebarPosition: SidebarPosition;
  verticalTabsEnabled: boolean;
  projectSidebarCollapsed: boolean;
  currentProjectPath: string | null;
  recentProjects: string[];
  sidecarStatus: SidecarStatus;
  isAuthenticated: boolean;
  commandPaletteOpen: boolean;
  settingsPanelOpen: boolean;
  copilotSidebarOpen: boolean;
  assistantPaneMode: AssistantPaneMode;
  showActionOverlay: boolean;
  browserUseAutoScreenshot: boolean;
  browserUsePersistScreenshots: boolean;
  browserUseMaxSteps: number;
  connectedSdkSession: string | null;
  actionTimelineDocked: ActionTimelinePosition;
  defaultEditor: EditorPreference;
  terminalShell: SessionShellType;
  sandboxMode: SessionSandboxMode;
  approvalPolicy: ApprovalPolicy;

  // -- Actions --
  setTheme: (theme: Theme) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  toggleVerticalTabs: () => void;
  toggleProjectSidebar: () => void;
  setProjectSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentProject: (path: string | null) => void;
  toggleCommandPalette: () => void;
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;
  toggleSettingsPanel: () => void;
  toggleCopilotSidebar: () => void;
  openCopilotPane: () => void;
  openReviewPane: () => void;
  toggleReviewPane: () => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setAuthenticated: (value: boolean) => void;
  toggleActionOverlay: () => void;
  setBrowserUseAutoScreenshot: (value: boolean) => void;
  setBrowserUsePersistScreenshots: (value: boolean) => void;
  setBrowserUseMaxSteps: (value: number) => void;
  setConnectedSdkSession: (sessionId: string | null) => void;
  setActionTimelineDocked: (position: ActionTimelinePosition) => void;
  setDefaultEditor: (editor: EditorPreference) => void;
  setTerminalShell: (shell: SessionShellType) => void;
  setSandboxMode: (mode: SessionSandboxMode) => void;
  setApprovalPolicy: (policy: ApprovalPolicy) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppStore>()(
  immer((set) => ({
    // -- State ---------------------------------------------------------------
    theme: 'dark' as Theme,
    sidebarPosition: 'left' as SidebarPosition,
    verticalTabsEnabled: false,
    projectSidebarCollapsed: false,
    currentProjectPath: null,
    recentProjects: [],
    sidecarStatus: 'stopped' as SidecarStatus,
    isAuthenticated: false,
    commandPaletteOpen: false,
    settingsPanelOpen: false,
    copilotSidebarOpen: false,
    assistantPaneMode: 'copilot' as AssistantPaneMode,
    showActionOverlay: true,
    browserUseAutoScreenshot: true,
    browserUsePersistScreenshots: true,
    browserUseMaxSteps: 50,
    connectedSdkSession: null,
    actionTimelineDocked: 'right' as ActionTimelinePosition,
    defaultEditor: 'vscode' as EditorPreference,
    terminalShell: 'powershell' as SessionShellType,
    sandboxMode: 'workspace-write' as SessionSandboxMode,
    approvalPolicy: 'on-request' as ApprovalPolicy,

    // -- Actions-------------------------------------------------------------

    setTheme: (theme: Theme) => {
      set((state) => {
        state.theme = theme;
      });
    },

    setSidebarPosition: (position: SidebarPosition) => {
      set((state) => {
        state.sidebarPosition = position;
      });
    },

    toggleVerticalTabs: () => {
      set((state) => {
        state.verticalTabsEnabled = !state.verticalTabsEnabled;
      });
    },

    toggleProjectSidebar: () => {
      set((state) => {
        state.projectSidebarCollapsed = !state.projectSidebarCollapsed;
      });
    },

    setProjectSidebarCollapsed: (collapsed: boolean) => {
      set((state) => {
        state.projectSidebarCollapsed = collapsed;
      });
    },

    setCurrentProject: (path: string | null) => {
      set((state) => {
        state.currentProjectPath = path;

        if (!path) {
          return;
        }

        state.recentProjects = [
          path,
          ...state.recentProjects.filter((projectPath) => projectPath !== path),
        ].slice(0, 8);
      });
    },

    toggleCommandPalette: () => {
      set((state) => {
        if (!state.commandPaletteOpen) {
          state.settingsPanelOpen = false;
        }
        state.commandPaletteOpen = !state.commandPaletteOpen;
      });
    },

    openSettingsPanel: () => {
      set((state) => {
        state.settingsPanelOpen = true;
        state.commandPaletteOpen = false;
      });
    },

    closeSettingsPanel: () => {
      set((state) => {
        state.settingsPanelOpen = false;
      });
    },

    toggleSettingsPanel: () => {
      set((state) => {
        const nextOpen = !state.settingsPanelOpen;
        state.settingsPanelOpen = nextOpen;
        if (nextOpen) {
          state.commandPaletteOpen = false;
        }
      });
    },

    toggleCopilotSidebar: () => {
      set((state) => {
        const nextOpen = !state.copilotSidebarOpen;
        state.copilotSidebarOpen = nextOpen;

        if (nextOpen) {
          state.assistantPaneMode = 'copilot';
        }
      });
    },

    openCopilotPane: () => {
      set((state) => {
        state.copilotSidebarOpen = true;
        state.assistantPaneMode = 'copilot';
      });
    },

    openReviewPane: () => {
      set((state) => {
        state.copilotSidebarOpen = true;
        state.assistantPaneMode = 'review';
      });
    },

    toggleReviewPane: () => {
      set((state) => {
        if (state.copilotSidebarOpen && state.assistantPaneMode === 'review') {
          state.assistantPaneMode = 'copilot';
          return;
        }

        state.copilotSidebarOpen = true;
        state.assistantPaneMode = 'review';
      });
    },

    setSidecarStatus: (status: SidecarStatus) => {
      set((state) => {
        state.sidecarStatus = status;
      });
    },

    setAuthenticated: (value: boolean) => {
      set((state) => {
        state.isAuthenticated = value;
      });
    },

    toggleActionOverlay: () => {
      set((state) => {
        state.showActionOverlay = !state.showActionOverlay;
      });
    },

    setBrowserUseAutoScreenshot: (value: boolean) => {
      set((state) => {
        state.browserUseAutoScreenshot = value;
      });
    },

    setBrowserUsePersistScreenshots: (value: boolean) => {
      set((state) => {
        state.browserUsePersistScreenshots = value;
      });
    },

    setBrowserUseMaxSteps: (value: number) => {
      set((state) => {
        state.browserUseMaxSteps = clampBrowserUseMaxSteps(value);
      });
    },

    setConnectedSdkSession: (sessionId: string | null) => {
      set((state) => {
        state.connectedSdkSession = sessionId;
      });
    },

    setActionTimelineDocked: (position: ActionTimelinePosition) => {
      set((state) => {
        state.actionTimelineDocked = position;
      });
    },

    setDefaultEditor: (editor: EditorPreference) => {
      set((state) => {
        state.defaultEditor = editor;
      });
    },

    setTerminalShell: (shell: SessionShellType) => {
      set((state) => {
        const next = applySessionExecutionSelectionChange(
          {
            shellType: state.terminalShell,
            sandboxMode: state.sandboxMode,
          },
          { shellType: shell },
        );
        state.terminalShell = next.shellType;
        state.sandboxMode = next.sandboxMode;
      });
    },

    setSandboxMode: (mode: SessionSandboxMode) => {
      set((state) => {
        const next = applySessionExecutionSelectionChange(
          {
            shellType: state.terminalShell,
            sandboxMode: state.sandboxMode,
          },
          { sandboxMode: mode },
        );
        state.terminalShell = next.shellType;
        state.sandboxMode = next.sandboxMode;
      });
    },

    setApprovalPolicy: (policy: ApprovalPolicy) => {
      set((state) => {
        state.approvalPolicy = policy;
      });
    },
  })),
);

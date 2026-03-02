// ---------------------------------------------------------------------------
// appStore.ts -- Zustand store for global application state in CopilotHub
// Manages theme, layout preferences, sidecar status, and UI toggles.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'dark' | 'light' | 'enterprise-blue' | 'system';

export type SidebarPosition = 'left' | 'right' | 'hidden';

export type SidecarStatus = 'stopped' | 'starting' | 'running' | 'error';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface AppStore {
  // -- State --
  theme: Theme;
  sidebarPosition: SidebarPosition;
  verticalTabsEnabled: boolean;
  sidecarStatus: SidecarStatus;
  isAuthenticated: boolean;
  commandPaletteOpen: boolean;
  copilotSidebarOpen: boolean;

  // -- Actions --
  setTheme: (theme: Theme) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  toggleVerticalTabs: () => void;
  toggleCommandPalette: () => void;
  toggleCopilotSidebar: () => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setAuthenticated: (value: boolean) => void;
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
    sidecarStatus: 'stopped' as SidecarStatus,
    isAuthenticated: false,
    commandPaletteOpen: false,
    copilotSidebarOpen: false,

    // -- Actions -------------------------------------------------------------

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

    toggleCommandPalette: () => {
      set((state) => {
        state.commandPaletteOpen = !state.commandPaletteOpen;
      });
    },

    toggleCopilotSidebar: () => {
      set((state) => {
        state.copilotSidebarOpen = !state.copilotSidebarOpen;
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
  })),
);

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../store/appStore';
import type { EntraAuthState } from '../lib/entraAuth';

const {
  authMock,
  emitAuthState,
  resetAuthMock,
  setAuthState,
} = vi.hoisted(() => {
  type MockAuthState = {
    isAuthenticated: boolean;
    accessToken: string | null;
    expiresAt: number | null;
    userInfo: {
      name: string;
      email: string;
      oid: string;
    } | null;
  };

  const unauthenticatedState: MockAuthState = {
    isAuthenticated: false,
    accessToken: null,
    expiresAt: null,
    userInfo: null,
  };

  let currentState: MockAuthState = { ...unauthenticatedState };
  const listeners = new Set<(state: MockAuthState) => void>();

  const cloneState = () => ({
    ...currentState,
    userInfo: currentState.userInfo ? { ...currentState.userInfo } : null,
  });

  const setAuthState = (nextState: MockAuthState) => {
    currentState = {
      ...nextState,
      userInfo: nextState.userInfo ? { ...nextState.userInfo } : null,
    };
  };

  const emitAuthState = (nextState: MockAuthState) => {
    setAuthState(nextState);
    const snapshot = cloneState();
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const authMock = {
    onAuthStateChange: vi.fn((callback: (state: MockAuthState) => void) => {
      listeners.add(callback);
      callback(cloneState());
      return () => {
        listeners.delete(callback);
      };
    }),
    getAccessToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getState: vi.fn(() => cloneState()),
  };

  const resetAuthMock = () => {
    listeners.clear();
    setAuthState(unauthenticatedState);
    authMock.onAuthStateChange.mockClear();
    authMock.getAccessToken.mockReset();
    authMock.login.mockReset();
    authMock.logout.mockReset();
    authMock.getState.mockClear();
  };

  return {
    authMock,
    emitAuthState,
    resetAuthMock,
    setAuthState,
  };
});

vi.mock('../lib/entraAuth', () => ({
  default: authMock,
}));

import { useEntraAuth } from './useEntraAuth';

function resetAppStore() {
  const currentState = useAppStore.getState();
  useAppStore.setState({
    ...currentState,
    theme: 'dark',
    sidebarPosition: 'left',
    verticalTabsEnabled: false,
    projectSidebarCollapsed: false,
    currentProjectPath: null,
    recentProjects: [],
    sidecarStatus: 'stopped',
    isAuthenticated: false,
    commandPaletteOpen: false,
    settingsPanelOpen: false,
    copilotSidebarOpen: false,
    assistantPaneMode: 'copilot',
    showActionOverlay: true,
    browserUseAutoScreenshot: true,
    browserUseMaxSteps: 50,
    connectedSdkSession: null,
    actionTimelineDocked: 'right',
    defaultEditor: 'vscode',
    terminalShell: 'powershell',
    sandboxMode: 'workspace-write',
    approvalPolicy: 'on-request',
  });
}

const authenticatedState: EntraAuthState = {
  isAuthenticated: true,
  accessToken: 'fresh-token',
  expiresAt: Date.now() + 60_000,
  userInfo: {
    name: 'Adele Vance',
    email: 'adele@contoso.com',
    oid: 'user-1',
  },
};

describe('useEntraAuth', () => {
  beforeEach(() => {
    resetAuthMock();
    resetAppStore();
    setAuthState(authenticatedState);
    authMock.getAccessToken.mockResolvedValue('fresh-token');
  });

  it('keeps the hook result and app store in sync when token refresh fails after expiry', async () => {
    authMock.getAccessToken
      .mockResolvedValueOnce('fresh-token')
      .mockImplementationOnce(async () => {
        emitAuthState({
          isAuthenticated: false,
          accessToken: null,
          expiresAt: null,
          userInfo: null,
        });

        return null;
      });

    const { result } = renderHook(() => useEntraAuth());

    await waitFor(() => {
      expect(useAppStore.getState().isAuthenticated).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.getToken();
    });

    await waitFor(() => {
      expect(useAppStore.getState().isAuthenticated).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});

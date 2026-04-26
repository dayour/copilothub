import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

import { createEntraAuth } from './entraAuth';

describe('EntraAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates concurrent token refresh calls', async () => {
    const auth = createEntraAuth();
    (auth as any).state = {
      isAuthenticated: true,
      accessToken: 'stale-token',
      expiresAt: Date.now() - 1_000,
      userInfo: {
        name: 'Adele Vance',
        email: 'adele@contoso.com',
        oid: 'user-1',
      },
    };

    invokeMock.mockResolvedValue({
      accessToken: 'fresh-token',
      expiresIn: 3600,
    });

    const [tokenA, tokenB] = await Promise.all([
      auth.getAccessToken(),
      auth.getAccessToken(),
    ]);

    expect(tokenA).toBe('fresh-token');
    expect(tokenB).toBe('fresh-token');
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(auth.getState().accessToken).toBe('fresh-token');
  });

  it('keeps the current token during the refresh buffer when refresh fails', async () => {
    const auth = createEntraAuth();
    (auth as any).state = {
      isAuthenticated: true,
      accessToken: 'current-token',
      expiresAt: Date.now() + 30_000,
      userInfo: {
        name: 'Adele Vance',
        email: 'adele@contoso.com',
        oid: 'user-1',
      },
    };

    invokeMock.mockRejectedValue(new Error('refresh failed'));

    await expect(auth.getAccessToken()).resolves.toBe('current-token');
    expect(auth.getState()).toMatchObject({
      isAuthenticated: true,
      accessToken: 'current-token',
    });
  });

  it('requests a scoped token without overwriting the cached Graph token', async () => {
    const auth = createEntraAuth();
    (auth as any).state = {
      isAuthenticated: true,
      accessToken: 'graph-token',
      expiresAt: Date.now() + 60_000,
      userInfo: {
        name: 'Adele Vance',
        email: 'adele@contoso.com',
        oid: 'user-1',
      },
    };

    invokeMock.mockResolvedValue({
      accessToken: 'vault-token',
      expiresIn: 3600,
    });

    await expect(auth.getAccessToken('https://vault.azure.net/.default')).resolves.toBe('vault-token');
    expect(auth.getState().accessToken).toBe('graph-token');
    expect(invokeMock).toHaveBeenCalledWith('refresh_entra_token', {
      auth: expect.objectContaining({
        scopes: ['https://vault.azure.net/.default'],
      }),
    });
  });

  it('clears auth state after an expired token cannot be refreshed', async () => {
    const auth = createEntraAuth();
    (auth as any).state = {
      isAuthenticated: true,
      accessToken: 'expired-token',
      expiresAt: Date.now() - 1_000,
      userInfo: {
        name: 'Adele Vance',
        email: 'adele@contoso.com',
        oid: 'user-1',
      },
    };

    const states: boolean[] = [];
    const unsubscribe = auth.onAuthStateChange((state) => {
      states.push(state.isAuthenticated);
    });

    invokeMock.mockRejectedValue(new Error('refresh failed'));

    await expect(auth.getAccessToken()).resolves.toBeNull();
    expect(auth.getState()).toMatchObject({
      isAuthenticated: false,
      accessToken: null,
      expiresAt: null,
      userInfo: null,
    });
    expect(states).toEqual([true, false]);

    unsubscribe();
  });
});

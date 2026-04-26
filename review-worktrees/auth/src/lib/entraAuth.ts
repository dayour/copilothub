// ---------------------------------------------------------------------------
// entraAuth.ts -- Entra ID authentication facade for CopilotHub
// Browser-safe MVP facade that delegates real auth work to a Tauri sidecar.
// ---------------------------------------------------------------------------

import { invoke } from '@tauri-apps/api/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntraAuthConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface EntraUserInfo {
  name: string;
  email: string;
  oid: string;
}

export interface EntraAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: number | null;
  userInfo: EntraUserInfo | null;
}

interface SidecarAuthResponse {
  accessToken?: string;
  expiresAt?: number | string;
  expiresIn?: number;
  userInfo?: Partial<EntraUserInfo>;
}

interface KeyVaultSecretResponse {
  value?: string;
  attributes?: {
    exp?: number;
  };
}

interface VaultCacheEntry {
  value: string;
  expiresAt: number;
}

type AuthStateListener = (state: EntraAuthState) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TOKEN_TTL_MS = 55 * 60 * 1000;
const DEFAULT_SECRET_TTL_MS = 5 * 60 * 1000;
const KEY_VAULT_API_VERSION = '7.4';

export const DEFAULT_CONFIG: EntraAuthConfig = {
  clientId: '00000000-0000-0000-0000-000000000000',
  tenantId: 'common',
  redirectUri: 'http://localhost:1420',
  scopes: ['https://graph.microsoft.com/.default'],
};

const initialState: EntraAuthState = {
  isAuthenticated: false,
  accessToken: null,
  expiresAt: null,
  userInfo: null,
};

const vaultSecretCache = new Map<string, VaultCacheEntry>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNonEmptyString(field: unknown): field is string {
  return !!field && typeof field === 'string' && field.length > 0;
}

function normalizeExpiresAt(input: SidecarAuthResponse): number {
  if (typeof input.expiresAt === 'number' && Number.isFinite(input.expiresAt)) {
    return input.expiresAt > 1_000_000_000_000 ? input.expiresAt : input.expiresAt * 1000;
  }

  if (typeof input.expiresAt === 'string') {
    const parsed = Date.parse(input.expiresAt);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (typeof input.expiresIn === 'number' && Number.isFinite(input.expiresIn) && input.expiresIn > 0) {
    return Date.now() + input.expiresIn * 1000;
  }

  return Date.now() + DEFAULT_TOKEN_TTL_MS;
}

function parseSidecarResponse(raw: unknown): SidecarAuthResponse {
  if (typeof raw === 'string') {
    return { accessToken: raw };
  }

  if (!isRecord(raw)) {
    return {};
  }

  const userInfo = isRecord(raw.userInfo)
    ? {
        name: typeof raw.userInfo.name === 'string' ? raw.userInfo.name : undefined,
        email: typeof raw.userInfo.email === 'string' ? raw.userInfo.email : undefined,
        oid: typeof raw.userInfo.oid === 'string' ? raw.userInfo.oid : undefined,
      }
    : undefined;

  return {
    accessToken: typeof raw.accessToken === 'string' ? raw.accessToken : undefined,
    expiresAt: typeof raw.expiresAt === 'number' || typeof raw.expiresAt === 'string' ? raw.expiresAt : undefined,
    expiresIn: typeof raw.expiresIn === 'number' ? raw.expiresIn : undefined,
    userInfo,
  };
}

function parseVaultPath(vaultPath: string): { cacheKey: string; vaultUrl: string; secretName: string } {
  if (!vaultPath.startsWith('vault://')) {
    throw new Error('Invalid vault path. Expected format: vault://<vault-name>/<secret-name>');
  }

  const [, rawLocation] = vaultPath.split('vault://');
  const segments = rawLocation.split('/').filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    throw new Error('Invalid vault path. Secret name is required.');
  }

  const [vaultName, ...secretSegments] = segments;
  const secretName = decodeURIComponent(secretSegments.join('/'));

  if (!/^[A-Za-z0-9-]+$/.test(vaultName)) {
    throw new Error(`Invalid vault name "${vaultName}"`);
  }

  if (!/^[A-Za-z0-9-]+$/.test(secretName)) {
    throw new Error(`Invalid secret name "${secretName}"`);
  }

  return {
    cacheKey: `${vaultName}/${secretName}`,
    vaultUrl: `https://${vaultName}.vault.azure.net`,
    secretName,
  };
}

function readCachedSecret(cacheKey: string): string | null {
  const entry = vaultSecretCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    vaultSecretCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function writeCachedSecret(cacheKey: string, value: string, ttlMs: number): void {
  const safeTtl = ttlMs > 0 ? ttlMs : DEFAULT_SECRET_TTL_MS;
  vaultSecretCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + safeTtl,
  });
}

// ---------------------------------------------------------------------------
// EntraAuth
// ---------------------------------------------------------------------------

export class EntraAuth {
  private readonly config: EntraAuthConfig;
  private state: EntraAuthState = { ...initialState };
  private readonly listeners = new Set<AuthStateListener>();
  private pendingRefresh: Promise<string | null> | null = null;

  constructor(config: EntraAuthConfig) {
    this.config = config;
  }

  public getState(): EntraAuthState {
    return { ...this.state, userInfo: this.state.userInfo ? { ...this.state.userInfo } : null };
  }

  public async login(): Promise<EntraAuthState> {
    const raw = await invoke<unknown>('start_sidecar', {
      auth: {
        provider: 'entra',
        clientId: this.config.clientId,
        tenantId: this.config.tenantId,
        redirectUri: this.config.redirectUri,
        scopes: this.config.scopes,
      },
    });

    const response = parseSidecarResponse(raw);
    if (!response.accessToken) {
      throw new Error('Sidecar did not return an access token.');
    }

    this.state = {
      isAuthenticated: true,
      accessToken: response.accessToken,
      expiresAt: normalizeExpiresAt(response),
      userInfo:
        hasNonEmptyString(response.userInfo?.name) &&
        hasNonEmptyString(response.userInfo?.email) &&
        hasNonEmptyString(response.userInfo?.oid)
          ? (response.userInfo as EntraUserInfo)
          : null,
    };
    this.notifyListeners();

    return this.getState();
  }

  public logout(): void {
    this.state = { ...initialState };
    this.notifyListeners();
  }

  public async getAccessToken(_scope?: string): Promise<string | null> {
    if (_scope && !this.config.scopes.includes(_scope)) {
      return this.getScopedAccessToken(_scope);
    }

    if (!this.state.accessToken) {
      return null;
    }

    if (this.isTokenExpired()) {
      return this.silentRefresh();
    }

    return this.state.accessToken;
  }

  public isTokenExpired(): boolean {
    if (!this.state.accessToken || !this.state.expiresAt) {
      return true;
    }

    return Date.now() >= this.state.expiresAt - 60_000;
  }

  public async silentRefresh(): Promise<string | null> {
    if (!this.state.accessToken) {
      return null;
    }

    if (!this.pendingRefresh) {
      this.pendingRefresh = this.runSilentRefresh().finally(() => {
        this.pendingRefresh = null;
      });
    }

    return this.pendingRefresh;
  }

  public onAuthStateChange(callback: (state: EntraAuthState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private async getScopedAccessToken(scope: string): Promise<string | null> {
    if (!this.state.accessToken) {
      return null;
    }

    try {
      const raw = await invoke<unknown>('refresh_entra_token', {
        auth: {
          clientId: this.config.clientId,
          tenantId: this.config.tenantId,
          redirectUri: this.config.redirectUri,
          scopes: [scope],
        },
      });
      const response = parseSidecarResponse(raw);
      return response.accessToken ?? null;
    } catch {
      return null;
    }
  }

  private async runSilentRefresh(): Promise<string | null> {
    const previousState = this.getState();

    try {
      const raw = await invoke<unknown>('refresh_entra_token', {
        auth: {
          clientId: this.config.clientId,
          tenantId: this.config.tenantId,
          redirectUri: this.config.redirectUri,
          scopes: this.config.scopes,
        },
      });

      const response = parseSidecarResponse(raw);
      if (!response.accessToken) {
        return this.handleRefreshFailure(previousState);
      }

      this.state = {
        ...this.state,
        isAuthenticated: true,
        accessToken: response.accessToken,
        expiresAt: normalizeExpiresAt(response),
        userInfo:
          hasNonEmptyString(response.userInfo?.name) &&
          hasNonEmptyString(response.userInfo?.email) &&
          hasNonEmptyString(response.userInfo?.oid)
            ? (response.userInfo as EntraUserInfo)
            : this.state.userInfo,
      };
      this.notifyListeners();
      return this.state.accessToken;
    } catch {
      return this.handleRefreshFailure(previousState);
    }
  }

  private handleRefreshFailure(previousState: EntraAuthState): string | null {
    if (
      previousState.accessToken &&
      typeof previousState.expiresAt === 'number' &&
      Date.now() < previousState.expiresAt
    ) {
      return previousState.accessToken;
    }

    const hadSession =
      this.state.isAuthenticated ||
      this.state.accessToken !== null ||
      this.state.expiresAt !== null ||
      this.state.userInfo !== null;

    this.state = { ...initialState };
    if (hadSession) {
      this.notifyListeners();
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Key Vault resolver
// ---------------------------------------------------------------------------

export async function resolveVaultSecret(vaultPath: string, auth: EntraAuth): Promise<string> {
  const { cacheKey, vaultUrl, secretName } = parseVaultPath(vaultPath);
  const cachedSecret = readCachedSecret(cacheKey);
  if (cachedSecret !== null) {
    return cachedSecret;
  }

  const accessToken = await auth.getAccessToken('https://vault.azure.net/.default');
  if (!accessToken) {
    throw new Error('Unable to resolve vault secret without a valid access token.');
  }

  const endpoint = `${vaultUrl}/secrets/${encodeURIComponent(secretName)}?api-version=${KEY_VAULT_API_VERSION}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Key Vault request failed (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as KeyVaultSecretResponse;
  if (typeof payload.value !== 'string' || payload.value.length === 0) {
    throw new Error('Key Vault response did not include a valid secret value.');
  }

  const ttlMs = payload.attributes?.exp ? Math.max(payload.attributes.exp * 1000 - Date.now(), 1_000) : DEFAULT_SECRET_TTL_MS;
  writeCachedSecret(cacheKey, payload.value, ttlMs);

  return payload.value;
}

// ---------------------------------------------------------------------------
// Singleton and factory
// ---------------------------------------------------------------------------

export function createEntraAuth(config?: Partial<EntraAuthConfig>): EntraAuth {
  return new EntraAuth({
    ...DEFAULT_CONFIG,
    ...config,
    scopes: config?.scopes ?? DEFAULT_CONFIG.scopes,
  });
}

const entraAuth = createEntraAuth();
export default entraAuth;

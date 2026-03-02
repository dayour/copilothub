// Application configuration constants.
// Centralized to avoid hardcoded values scattered across components.

export const APP_CONFIG = {
  name: 'CopilotHub',
  version: '1.0.0',
  description: 'Enterprise Agentic Desktop OS',

  // Default URLs
  defaultBrowserUrl: '', // empty = show NewTabPage
  vsCodeUrl: 'https://vscode.dev',

  // Runbook storage
  runbookDirName: 'CopilotOS',
  runbookSubDir: 'Runbooks',

  // MCP sidecar
  sidecarHost: 'localhost',
  sidecarPort: 3000,
  sidecarTimeout: 30000,

  // UI constants
  tabHeight: 36,
  titlebarHeight: 32,
  sidebarWidth: 280,
  addressBarHeight: 40,
  maxTabs: 20,
  terminalFontSize: 13,
  terminalFontFamily: 'Cascadia Code, Consolas, Courier New, monospace',

  // Chat
  maxStreamIterations: 10000,
  mentionTrigger: '@',

  // Entra auth (placeholders)
  entraClientId: '00000000-0000-0000-0000-000000000000',
  entraTenantId: 'common',
  entraRedirectUri: 'http://localhost:1420',
  entraDefaultScopes: ['https://graph.microsoft.com/.default'],
} as const;

export type AppConfig = typeof APP_CONFIG;

// --- Config validation ---

export interface ConfigValidationError {
  field: string;
  message: string;
}

const PORT_MIN = 1024;
const PORT_MAX = 65535;
const TIMEOUT_MAX_MS = 300_000; // 5 minutes
const URL_PATTERN = /^https?:\/\/.+/;

/**
 * Validate a port number is within the safe user-space range.
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= PORT_MIN && port <= PORT_MAX;
}

/**
 * Validate a URL string matches http(s) scheme.
 * Empty string is allowed (e.g. defaultBrowserUrl).
 */
export function isValidUrl(url: string, allowEmpty = false): boolean {
  if (url === '' && allowEmpty) return true;
  return URL_PATTERN.test(url);
}

/**
 * Validate a timeout value is a positive finite number under the ceiling.
 */
export function isValidTimeout(ms: number): boolean {
  return Number.isFinite(ms) && ms > 0 && ms <= TIMEOUT_MAX_MS;
}

/**
 * Validate APP_CONFIG values at runtime. Returns an empty array if valid.
 */
export function validateAppConfig(
  config: Pick<AppConfig, 'sidecarPort' | 'sidecarTimeout' | 'vsCodeUrl' | 'defaultBrowserUrl' | 'maxTabs' | 'entraRedirectUri'>
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isValidPort(config.sidecarPort)) {
    errors.push({ field: 'sidecarPort', message: `Port must be between ${PORT_MIN} and ${PORT_MAX}` });
  }

  if (!isValidTimeout(config.sidecarTimeout)) {
    errors.push({ field: 'sidecarTimeout', message: `Timeout must be a positive number up to ${TIMEOUT_MAX_MS}ms` });
  }

  if (!isValidUrl(config.vsCodeUrl)) {
    errors.push({ field: 'vsCodeUrl', message: 'Must be a valid http(s) URL' });
  }

  if (!isValidUrl(config.defaultBrowserUrl, true)) {
    errors.push({ field: 'defaultBrowserUrl', message: 'Must be empty or a valid http(s) URL' });
  }

  if (!isValidUrl(config.entraRedirectUri)) {
    errors.push({ field: 'entraRedirectUri', message: 'Must be a valid http(s) URL' });
  }

  if (!Number.isInteger(config.maxTabs) || config.maxTabs < 1 || config.maxTabs > 100) {
    errors.push({ field: 'maxTabs', message: 'maxTabs must be an integer between 1 and 100' });
  }

  return errors;
}

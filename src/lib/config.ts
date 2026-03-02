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

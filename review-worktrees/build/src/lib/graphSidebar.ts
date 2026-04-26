import { APP_CONFIG } from './config';
import { DEFAULT_CONFIG } from './entraAuth';
import { isGraphClientError } from './graphClient';

export const GRAPH_WIDGET_SCOPES = {
  profile: ['User.Read'],
  calendar: ['Calendars.Read'],
  files: ['Files.Read'],
  mail: ['Mail.Read'],
} as const;

export function isGraphSidebarConfigured(clientId: string = APP_CONFIG.entraClientId): boolean {
  const normalizedClientId = clientId.trim();
  return normalizedClientId.length > 0 && normalizedClientId !== DEFAULT_CONFIG.clientId;
}

export function formatGraphWidgetError(error: unknown, scopes: readonly string[]): string {
  if (isGraphClientError(error)) {
    switch (error.code) {
      case 'auth_required':
        return 'Sign in with Entra to load Microsoft 365 data.';
      case 'insufficient_scope':
        return `Additional Graph permissions are required: ${scopes.join(', ')}.`;
      case 'throttled':
        return error.retryAfterSeconds
          ? `Microsoft Graph is throttling requests. Retry in about ${error.retryAfterSeconds} seconds.`
          : 'Microsoft Graph is throttling requests. Retry shortly.';
      case 'network_error':
        return 'Unable to reach Microsoft Graph. Check connectivity and try again.';
      default:
        return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Microsoft Graph data is currently unavailable.';
}

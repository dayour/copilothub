export type MicrosoftPanelTabType = 'copilot-studio' | 'power-platform';

export const COPILOT_STUDIO_URL = 'https://copilotstudio.microsoft.com';
export const POWER_APPS_URL = 'https://make.powerapps.com';
export const POWER_AUTOMATE_URL = 'https://make.powerautomate.com';

export interface MicrosoftPanelDestination {
  id: string;
  label: string;
  url: string;
}

export interface MicrosoftPanelDefinition {
  title: string;
  description: string;
  defaultUrl: string;
  destinations: MicrosoftPanelDestination[];
  browserHostMode: 'companion-window';
  showAddressBarInTauri: boolean;
}

export const MICROSOFT_PANEL_DEFINITIONS: Record<MicrosoftPanelTabType, MicrosoftPanelDefinition> = {
  'copilot-studio': {
    title: 'Copilot Studio',
    description: 'Build, test, and publish Microsoft Copilot Studio agents inside the native app shell when available.',
    defaultUrl: COPILOT_STUDIO_URL,
    browserHostMode: 'companion-window',
    showAddressBarInTauri: true,
    destinations: [
      {
        id: 'copilot-studio-home',
        label: 'Copilot Studio',
        url: COPILOT_STUDIO_URL,
      },
    ],
  },
  'power-platform': {
    title: 'Power Platform',
    description: 'Open the Power Apps and Power Automate maker experiences with the same native webview foundation used by browser tabs.',
    defaultUrl: POWER_APPS_URL,
    browserHostMode: 'companion-window',
    showAddressBarInTauri: true,
    destinations: [
      {
        id: 'power-apps-maker',
        label: 'Power Apps',
        url: POWER_APPS_URL,
      },
      {
        id: 'power-automate-maker',
        label: 'Power Automate',
        url: POWER_AUTOMATE_URL,
      },
    ],
  },
};

const MICROSOFT_PANEL_ALLOWED_ORIGINS: Record<MicrosoftPanelTabType, Set<string>> = {
  'copilot-studio': new Set(['https://copilotstudio.microsoft.com']),
  'power-platform': new Set(['https://make.powerapps.com', 'https://make.powerautomate.com']),
};

function normalizeMicrosoftPanelUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isMicrosoftPanelTab(type: string): type is MicrosoftPanelTabType {
  return type === 'copilot-studio' || type === 'power-platform';
}

export function getMicrosoftPanelDefaultUrl(type: string): string {
  if (!isMicrosoftPanelTab(type)) {
    return '';
  }

  return MICROSOFT_PANEL_DEFINITIONS[type].defaultUrl;
}

export function isAllowedMicrosoftPanelUrl(type: MicrosoftPanelTabType, url: string): boolean {
  const parsed = normalizeMicrosoftPanelUrl(url);
  if (!parsed) {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  return MICROSOFT_PANEL_ALLOWED_ORIGINS[type].has(parsed.origin);
}

export function resolveMicrosoftPanelUrl(type: MicrosoftPanelTabType, url: string): string {
  if (isAllowedMicrosoftPanelUrl(type, url)) {
    return url;
  }

  return MICROSOFT_PANEL_DEFINITIONS[type].defaultUrl;
}

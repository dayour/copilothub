import { useEffect } from 'react';
import { useAppStore, type Theme } from '../store/appStore';

const darkTheme: Record<string, string> = {
  '--color-surface-primary': '#1e1e1e',
  '--color-surface-secondary': '#252526',
  '--color-surface-tertiary': '#2d2d30',
  '--color-surface-elevated': '#333337',
  '--color-surface-hover': '#3e3e42',
  '--color-surface-active': '#505050',
  '--color-border-default': '#3e3e42',
  '--color-border-subtle': '#2d2d30',
  '--color-border-strong': '#505050',
  '--color-text-primary': '#cccccc',
  '--color-text-secondary': '#9d9d9d',
  '--color-text-muted': '#6e6e6e',
  '--color-text-inverse': '#1e1e1e',
  '--color-accent-primary': '#0078d4',
  '--color-tab-active': '#1e1e1e',
  '--color-tab-inactive': '#2d2d30',
  '--color-tab-hover': '#333337',
};

const lightTheme: Record<string, string> = {
  '--color-surface-primary': '#ffffff',
  '--color-surface-secondary': '#f3f3f3',
  '--color-surface-tertiary': '#e5e5e5',
  '--color-surface-elevated': '#ffffff',
  '--color-surface-hover': '#e8e8e8',
  '--color-surface-active': '#d4d4d4',
  '--color-border-default': '#d4d4d4',
  '--color-border-subtle': '#e5e5e5',
  '--color-border-strong': '#b3b3b3',
  '--color-text-primary': '#1e1e1e',
  '--color-text-secondary': '#616161',
  '--color-text-muted': '#9e9e9e',
  '--color-text-inverse': '#ffffff',
  '--color-tab-active': '#ffffff',
  '--color-tab-inactive': '#f3f3f3',
  '--color-tab-hover': '#e8e8e8',
};

const enterpriseBlueTheme: Record<string, string> = {
  '--color-surface-primary': '#0a1929',
  '--color-surface-secondary': '#0d2137',
  '--color-surface-tertiary': '#122d4d',
  '--color-surface-elevated': '#173a5e',
  '--color-surface-hover': '#1e4976',
  '--color-surface-active': '#2b5f8e',
  '--color-border-default': '#1e4976',
  '--color-border-subtle': '#122d4d',
  '--color-border-strong': '#2b5f8e',
  '--color-text-primary': '#e0e8f0',
  '--color-text-secondary': '#8ba3bd',
  '--color-text-muted': '#5a7a99',
  '--color-text-inverse': '#0a1929',
  '--color-accent-primary': '#2196f3',
  '--color-tab-active': '#0a1929',
  '--color-tab-inactive': '#0d2137',
  '--color-tab-hover': '#122d4d',
};

function getThemeByName(theme: Exclude<Theme, 'system'>): Record<string, string> {
  switch (theme) {
    case 'light':
      return lightTheme;
    case 'enterprise-blue':
      return enterpriseBlueTheme;
    case 'dark':
    default:
      return darkTheme;
  }
}

function applyTheme(theme: Record<string, string>): void {
  const root = document.documentElement;
  Object.entries(theme).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

export function useTheme(): void {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applySelectedTheme = () => {
      const effectiveTheme =
        theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme;
      applyTheme(getThemeByName(effectiveTheme));
    };

    applySelectedTheme();

    let handleSystemThemeChange: (() => void) | null = null;
    if (theme === 'system') {
      handleSystemThemeChange = () => {
        applySelectedTheme();
      };
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    return () => {
      if (handleSystemThemeChange) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      }
    };
  }, [theme]);
}

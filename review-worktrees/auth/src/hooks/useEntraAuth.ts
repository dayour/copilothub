import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import entraAuth from '../lib/entraAuth';
import { logger } from '../lib/logger';

export function useEntraAuth() {
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = entraAuth.onAuthStateChange((state) => {
      // Store auth state in app store for access by other components
      // We'll use a simple approach: just track if authenticated
      setAuthenticated(state.isAuthenticated);
      logger.info('auth', 'Auth state changed', state.isAuthenticated ? 'authenticated' : 'unauthenticated');
    });

    // Attempt silent login on startup (will fail gracefully if no cached token)
    entraAuth.getAccessToken().catch(() => {
      logger.info('auth', 'No cached Entra token');
    });

    return unsubscribe;
  }, [setAuthenticated]);

  return {
    login: () => entraAuth.login(),
    logout: () => entraAuth.logout(),
    getToken: (scope?: string) => entraAuth.getAccessToken(scope),
    isAuthenticated,
  };
}

import { isLocalhostUrl } from './config';

export type VsCodeConnectionMode = 'local-server' | 'remote-fallback';

export function buildVsCodeWorkbenchUrl(baseUrl: string, projectPath: string | null | undefined): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return baseUrl;
  }

  const trimmedProjectPath = projectPath?.trim();

  if (isLocalhostUrl(baseUrl) && trimmedProjectPath) {
    parsed.searchParams.set('folder', trimmedProjectPath);
  }

  return parsed.toString();
}

export function resolveVsCodeConnectionMode(localServerHealthy: boolean): VsCodeConnectionMode {
  return localServerHealthy ? 'local-server' : 'remote-fallback';
}

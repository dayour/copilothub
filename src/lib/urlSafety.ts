const URL_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const URL_WITH_AUTHORITY_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

export const SAFE_EXTERNAL_URL_PROTOCOLS = new Set(['http:', 'https:']);
export const SAFE_MARKDOWN_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function getDefaultBaseUrl(): string {
  return typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost';
}

export function normalizeUrlForNavigation(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (URL_WITH_AUTHORITY_SCHEME_REGEX.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getSafeExternalHref(
  value: string,
  allowedProtocols: ReadonlySet<string> = SAFE_EXTERNAL_URL_PROTOCOLS,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return allowedProtocols.has(url.protocol) ? trimmed : null;
  } catch {
    return null;
  }
}

export function getSafeMarkdownHref(
  rawUrl: string,
  allowedProtocols: ReadonlySet<string> = SAFE_MARKDOWN_LINK_PROTOCOLS,
  baseUrl = getDefaultBaseUrl(),
): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, baseUrl);
    const hasExplicitProtocol = URL_SCHEME_REGEX.test(trimmed);
    if (hasExplicitProtocol && !allowedProtocols.has(parsed.protocol)) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

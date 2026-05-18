import { describe, expect, it } from 'vitest';
import {
  getSafeExternalHref,
  getSafeMarkdownHref,
  normalizeUrlForNavigation,
} from './urlSafety';

describe('urlSafety', () => {
  describe('normalizeUrlForNavigation', () => {
    it('trims and adds https to host-like input', () => {
      expect(normalizeUrlForNavigation(' example.com ')).toBe('https://example.com');
    });

    it('preserves URLs that already include an authority protocol', () => {
      expect(normalizeUrlForNavigation('http://example.com')).toBe('http://example.com');
      expect(normalizeUrlForNavigation('custom://example')).toBe('custom://example');
    });
  });

  describe('getSafeExternalHref', () => {
    it('allows http and https absolute URLs', () => {
      expect(getSafeExternalHref('https://example.com/docs')).toBe('https://example.com/docs');
      expect(getSafeExternalHref('http://example.com/docs')).toBe('http://example.com/docs');
    });

    it('blocks non-web and relative URLs', () => {
      expect(getSafeExternalHref('javascript:alert(1)')).toBeNull();
      expect(getSafeExternalHref('mailto:user@example.com')).toBeNull();
      expect(getSafeExternalHref('/docs')).toBeNull();
    });
  });

  describe('getSafeMarkdownHref', () => {
    it('allows web, mail, and relative markdown links', () => {
      expect(getSafeMarkdownHref('https://example.com/docs')).toBe('https://example.com/docs');
      expect(getSafeMarkdownHref('mailto:user@example.com')).toBe('mailto:user@example.com');
      expect(getSafeMarkdownHref('/docs')).toBe('/docs');
    });

    it('blocks markdown links with unsafe explicit protocols', () => {
      expect(getSafeMarkdownHref('javascript:alert(1)')).toBeNull();
      expect(getSafeMarkdownHref('data:text/html;base64,PHNjcmlwdA==')).toBeNull();
    });
  });
});

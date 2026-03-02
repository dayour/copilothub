import { describe, expect, it } from 'vitest';

import { APP_CONFIG, isValidPort, isValidTimeout, isValidUrl, validateAppConfig } from './config';

describe('config validation', () => {
  describe('isValidPort', () => {
    it('accepts valid user-space ports', () => {
      expect(isValidPort(1024)).toBe(true);
      expect(isValidPort(3000)).toBe(true);
      expect(isValidPort(8080)).toBe(true);
      expect(isValidPort(65535)).toBe(true);
    });

    it('rejects privileged ports', () => {
      expect(isValidPort(0)).toBe(false);
      expect(isValidPort(80)).toBe(false);
      expect(isValidPort(443)).toBe(false);
      expect(isValidPort(1023)).toBe(false);
    });

    it('rejects out-of-range values', () => {
      expect(isValidPort(65536)).toBe(false);
      expect(isValidPort(-1)).toBe(false);
      expect(isValidPort(1.5)).toBe(false);
      expect(isValidPort(NaN)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('accepts http and https URLs', () => {
      expect(isValidUrl('https://vscode.dev')).toBe(true);
      expect(isValidUrl('http://localhost:1420')).toBe(true);
      expect(isValidUrl('https://graph.microsoft.com')).toBe(true);
    });

    it('rejects non-URL strings', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://files.example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('handles empty string with allowEmpty flag', () => {
      expect(isValidUrl('', true)).toBe(true);
      expect(isValidUrl('', false)).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isValidTimeout', () => {
    it('accepts positive timeouts within ceiling', () => {
      expect(isValidTimeout(1000)).toBe(true);
      expect(isValidTimeout(30000)).toBe(true);
      expect(isValidTimeout(300000)).toBe(true);
    });

    it('rejects zero, negative, and over-ceiling', () => {
      expect(isValidTimeout(0)).toBe(false);
      expect(isValidTimeout(-1)).toBe(false);
      expect(isValidTimeout(300001)).toBe(false);
      expect(isValidTimeout(Infinity)).toBe(false);
    });
  });

  describe('validateAppConfig', () => {
    it('passes for the default APP_CONFIG', () => {
      const errors = validateAppConfig(APP_CONFIG);
      expect(errors).toEqual([]);
    });

    it('reports invalid sidecarPort', () => {
      const errors = validateAppConfig({ ...APP_CONFIG, sidecarPort: 80 as any });
      expect(errors.some((e) => e.field === 'sidecarPort')).toBe(true);
    });

    it('reports invalid sidecarTimeout', () => {
      const errors = validateAppConfig({ ...APP_CONFIG, sidecarTimeout: -1 as any });
      expect(errors.some((e) => e.field === 'sidecarTimeout')).toBe(true);
    });

    it('reports invalid vsCodeUrl', () => {
      const errors = validateAppConfig({ ...APP_CONFIG, vsCodeUrl: 'not-valid' as any });
      expect(errors.some((e) => e.field === 'vsCodeUrl')).toBe(true);
    });

    it('reports invalid maxTabs', () => {
      const errors = validateAppConfig({ ...APP_CONFIG, maxTabs: 0 as any });
      expect(errors.some((e) => e.field === 'maxTabs')).toBe(true);

      const errors2 = validateAppConfig({ ...APP_CONFIG, maxTabs: 101 as any });
      expect(errors2.some((e) => e.field === 'maxTabs')).toBe(true);
    });

    it('accumulates multiple errors', () => {
      const errors = validateAppConfig({
        ...APP_CONFIG,
        sidecarPort: 10 as any,
        sidecarTimeout: 0 as any,
        maxTabs: -5 as any,
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});

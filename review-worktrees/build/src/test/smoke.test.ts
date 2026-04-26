import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Vitest smoke test', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('basic assertion works', () => {
    expect(1 + 1).toBe(2);
  });

  it('async works', async () => {
    const result = await Promise.resolve('hello');
    expect(result).toBe('hello');
  });
});

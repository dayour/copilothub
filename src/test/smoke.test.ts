import { describe, it, expect } from 'vitest';

describe('Vitest smoke test', () => {
  it('basic assertion works', () => {
    expect(1 + 1).toBe(2);
  });

  it('async works', async () => {
    const result = await Promise.resolve('hello');
    expect(result).toBe('hello');
  });
});

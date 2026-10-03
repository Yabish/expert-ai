import { describe, expect, it } from 'vitest';
import { packageName } from './index.js';

describe('@expert-ai/query-guard', () => {
  it('exposes its package name', () => {
    expect(packageName).toBe('@expert-ai/query-guard');
  });
});

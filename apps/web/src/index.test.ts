import { describe, expect, it } from 'vitest';
import { packageName } from './index.js';

describe('@expert-ai/web', () => {
  it('exposes its package name', () => {
    expect(packageName).toBe('@expert-ai/web');
  });
});

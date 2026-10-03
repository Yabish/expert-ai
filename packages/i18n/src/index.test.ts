import { describe, expect, it } from 'vitest';
import { packageName } from './index.js';

describe('@expert-ai/i18n', () => {
  it('exposes its package name', () => {
    expect(packageName).toBe('@expert-ai/i18n');
  });
});

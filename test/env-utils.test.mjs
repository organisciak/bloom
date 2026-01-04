import { describe, it, expect } from 'vitest';
import { getServerEnv } from '../website/src/pages/api/env.ts';

describe('api env helpers', () => {
  it('falls back to later sources when earlier values are empty', () => {
    // arrange
    const sources = [{ OPENAI_API_KEY: '' }, { OPENAI_API_KEY: 'key-from-env' }];

    // act
    const value = getServerEnv('OPENAI_API_KEY', sources);

    // assert
    expect(value).toBe('key-from-env');
  });

  it('returns undefined when no sources provide a value', () => {
    // arrange
    const sources = [{ OPENAI_API_KEY: '' }, undefined];

    // act
    const value = getServerEnv('OPENAI_API_KEY', sources);

    // assert
    expect(value).toBeUndefined();
  });
});

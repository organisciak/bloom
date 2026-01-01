import { describe, it, expect } from 'vitest';
import { pickRandomPattern } from '../website/src/repl/random_utils.mjs';

describe('pickRandomPattern', () => {
  it('prefers favorites when available', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;
    const favorites = [{ id: 'fav', code: 'a' }];
    const patterns = [{ id: 'other', code: 'b' }];
    const result = pickRandomPattern({ favorites, patterns, avoidIds: [] });
    expect(result.id).toBe('fav');
    Math.random = originalRandom;
  });

  it('avoids recent ids when possible', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.8;
    const patterns = [
      { id: 'one', code: 'a' },
      { id: 'two', code: 'b' },
    ];
    const result = pickRandomPattern({ favorites: [], patterns, avoidIds: ['two'] });
    expect(result.id).toBe('one');
    Math.random = originalRandom;
  });

  it('returns null when no patterns exist', () => {
    const result = pickRandomPattern({ favorites: [], patterns: [], avoidIds: [] });
    expect(result).toBeNull();
  });
});

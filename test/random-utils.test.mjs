import { describe, expect, it } from 'vitest';
import { getRandomButtonState } from '../website/src/repl/random_utils.mjs';

describe('getRandomButtonState', () => {
  it('returns a disabled state when there are no patterns', () => {
    // arrange: no favorites or patterns
    const favorites = [];
    const patterns = [];

    // act: build button state
    const state = getRandomButtonState({ favorites, patterns });

    // assert: button reads as disabled with the empty message
    expect(state).toEqual({
      hasPatterns: false,
      title: 'no patterns saved yet',
    });
  });

  it('returns an enabled state when favorites or patterns exist', () => {
    // arrange: favorites present
    const favorites = [{ id: 'fav-1' }];
    const patterns = [];

    // act: build button state
    const state = getRandomButtonState({ favorites, patterns });

    // assert: button reads as ready
    expect(state).toEqual({
      hasPatterns: true,
      title: 'random (favorites first)',
    });
  });
});

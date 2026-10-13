import { describe, expect, it } from 'vitest';
import { deckFromSearch, withSlide } from '../website/src/repl/deck_url.mjs';

describe('deckFromSearch', () => {
  it('reads the deck and a 1-based slide', () => {
    expect(deckFromSearch('?deck=genres&slide=12')).toEqual({ name: 'genres', index: 11 });
  });

  it('starts at the first slide when slide is missing or junk', () => {
    expect(deckFromSearch('?deck=toy')).toEqual({ name: 'toy', index: 0 });
    expect(deckFromSearch('?deck=toy&slide=zero')).toEqual({ name: 'toy', index: 0 });
  });

  it('rejects deck names that could escape the decks folder', () => {
    // the name becomes part of a fetch path
    expect(deckFromSearch('?deck=../secrets')).toBeNull();
    expect(deckFromSearch('?other=1')).toBeNull();
  });
});

describe('withSlide', () => {
  it('sets the slide and keeps the hash', () => {
    expect(withSlide('http://x/?deck=genres#abc', 4)).toBe('http://x/?deck=genres&slide=5#abc');
  });

  it('leaves URLs without a deck alone', () => {
    expect(withSlide('http://x/#abc', 4)).toBe('http://x/#abc');
  });
});

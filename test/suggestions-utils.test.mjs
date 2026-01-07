import { describe, it, expect } from 'vitest';
import {
  buildSuggestionsFromText,
  deriveSuggestionsFromText,
  normalizeSuggestions,
} from '../website/src/pages/api/suggestions.ts';

describe('suggestions utils', () => {
  it('normalizes and filters suggestion items', () => {
    // arrange
    const input = [
      { title: '  Layer drums  ', prompt: '  Add hats  ', why: '  tighten the groove  ' },
      { title: 'No prompt', prompt: '   ' },
    ];

    // act
    const result = normalizeSuggestions(input);

    // assert
    expect(result).toEqual([{ title: 'Layer drums', prompt: 'Add hats', why: 'tighten the groove' }]);
  });

  it('normalizes string and alternate suggestion keys', () => {
    // arrange
    const input = [
      'Add tape flutter',
      { text: 'Bring in a sub pulse', reason: 'ground the low end' },
      { title: 'Lift the hats', suggestion: 'Add syncopated hats' },
      { name: 'Soft shimmer', edit: 'Add airy pad swells' },
    ];

    // act
    const result = normalizeSuggestions(input);

    // assert
    expect(result).toEqual([
      { title: 'Add tape flutter', prompt: 'Add tape flutter', why: '' },
      { title: 'Bring in a sub pulse', prompt: 'Bring in a sub pulse', why: 'ground the low end' },
      { title: 'Lift the hats', prompt: 'Add syncopated hats', why: '' },
      { title: 'Soft shimmer', prompt: 'Add airy pad swells', why: '' },
    ]);
  });

  it('derives suggestions from bullet lines', () => {
    // arrange
    const text = '- Layer drums - Add syncopated hats\n- Add texture - Introduce noise sweeps';

    // act
    const result = deriveSuggestionsFromText(text);

    // assert
    expect(result).toEqual([
      { title: 'Layer drums', prompt: 'Add syncopated hats', why: '' },
      { title: 'Add texture', prompt: 'Introduce noise sweeps', why: '' },
    ]);
  });

  it('falls back to text when JSON suggestions are missing', () => {
    // arrange
    const text = 'Add swing to the hats';
    const parsed = { note: 'no suggestions here' };

    // act
    const result = buildSuggestionsFromText(text, parsed);

    // assert
    expect(result).toEqual([{ title: 'Add swing to the hats', prompt: 'Add swing to the hats', why: '' }]);
  });

  it('uses alternate suggestion keys from parsed JSON', () => {
    // arrange
    const text = 'ignored';
    const parsed = { ideas: ['Add rim accents', 'Bring the bass in'] };

    // act
    const result = buildSuggestionsFromText(text, parsed);

    // assert
    expect(result).toEqual([
      { title: 'Add rim accents', prompt: 'Add rim accents', why: '' },
      { title: 'Bring the bass in', prompt: 'Bring the bass in', why: '' },
    ]);
  });

  it('returns empty list when no suggestions can be derived', () => {
    // arrange
    const text = '   ';

    // act
    const result = buildSuggestionsFromText(text, null);

    // assert
    expect(result).toEqual([]);
  });
});

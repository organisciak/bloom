import { describe, it, expect } from 'vitest';
import {
  buildHydraExample,
  buildStrudelExample,
  getEasyWins,
  getPairWith,
  getQuickTips,
  getLiveTweak,
} from '../website/src/repl/reference_utils.mjs';

describe('reference utils', () => {
  it('uses examples when present', () => {
    // arrange
    const entry = { source: 'strudel', examples: ['s("bd")'] };

    // act
    const examples = getEasyWins(entry);

    // assert
    expect(examples).toEqual(['s("bd")']);
  });

  it('builds a strudel pattern method example', () => {
    // arrange
    const entry = { name: 'fast', source: 'strudel', memberof: 'Pattern', params: [{ name: 'factor' }] };

    // act
    const example = buildStrudelExample(entry);

    // assert
    expect(example).toBe('s("bd hh sd hh").fast(2)');
  });

  it('builds a hydra source example', () => {
    // arrange
    const entry = { name: 'osc', source: 'hydra', meta: { category: 'Sources' }, params: [] };

    // act
    const example = buildHydraExample(entry);

    // assert
    expect(example).toBe('osc().out()');
  });

  it('uses available instruments in sound examples', () => {
    // arrange
    const entry = { name: 'sound', source: 'strudel', params: [] };
    const soundContext = { synths: ['pulse'] };

    // act
    const example = buildStrudelExample(entry, soundContext);

    // assert
    expect(example).toBe('s("pulse")');
  });

  it('includes tips and pairings', () => {
    // arrange
    const entry = { name: 'rotate', source: 'hydra', params: [{ name: 'angle' }] };

    // act
    const tips = getQuickTips(entry);
    const pairings = getPairWith(entry);
    const tweak = getLiveTweak(entry);

    // assert
    expect(tips.length).toBeGreaterThan(0);
    expect(pairings.length).toBeGreaterThan(0);
    expect(tweak).toContain('angle');
  });
});

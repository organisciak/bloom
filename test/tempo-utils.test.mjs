import { describe, it, expect } from 'vitest';
import { cpsToCpm } from '../website/src/repl/tempo_utils.mjs';

describe('tempo utils', () => {
  it('converts cps to cpm', () => {
    // arrange
    const cps = 1;

    // act
    const cpm = cpsToCpm(cps);

    // assert
    expect(cpm).toBe(60);
  });

  it('returns null when cps is not finite', () => {
    // arrange
    const cps = Number.NaN;

    // act
    const cpm = cpsToCpm(cps);

    // assert
    expect(cpm).toBeNull();
  });
});

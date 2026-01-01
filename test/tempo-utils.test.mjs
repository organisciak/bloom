import { describe, it, expect } from 'vitest';
import { createTapTempo, clampTempo, cpsToCpm } from '../website/src/repl/tempo_utils.mjs';

describe('tempo utils', () => {
  it('calculates cps from taps', () => {
    const tap = createTapTempo({ windowSize: 4, timeoutMs: 2000 });
    expect(tap.registerTap(0)).toBeNull();
    const cps = tap.registerTap(1000);
    expect(cps).toBeCloseTo(1);
  });

  it('resets after timeout', () => {
    const tap = createTapTempo({ windowSize: 4, timeoutMs: 500 });
    expect(tap.registerTap(0)).toBeNull();
    const cps = tap.registerTap(1000);
    expect(cps).toBeNull();
    expect(tap.count()).toBe(1);
  });

  it('clamps cps and converts to cpm', () => {
    expect(clampTempo(0.01)).toBeCloseTo(0.1);
    expect(clampTempo(20)).toBeCloseTo(8);
    expect(cpsToCpm(1)).toBe(60);
  });
});

import { describe, expect, it } from 'vitest';
import { audioOnlyCode, flagLevels, levelStats, toDb } from '../website/src/repl/deck_meter.mjs';

describe('levelStats', () => {
  it('measures a full-scale square wave as 0 dB peak and 0 dB RMS', () => {
    // arrange: alternating +1/-1 has RMS equal to its peak
    const square = Float32Array.from({ length: 1000 }, (_, i) => (i % 2 ? 1 : -1));
    // act + assert
    expect(levelStats([square])).toEqual({ peakDb: 0, rmsDb: 0 });
  });

  it('pools all channels and reports silence as -Infinity', () => {
    const quiet = new Float32Array(100).fill(0.5);
    const silent = new Float32Array(100);
    const { peakDb, rmsDb } = levelStats([quiet, silent]);
    expect(peakDb).toBeCloseTo(-6, 0);
    expect(rmsDb).toBeCloseTo(toDb(Math.sqrt(0.125)), 1);
    expect(levelStats([silent])).toEqual({ peakDb: -Infinity, rmsDb: -Infinity });
  });
});

describe('audioOnlyCode', () => {
  it('drops Hydra lines and keeps the music', () => {
    // Hydra needs a canvas; the offline render only needs sound
    const code = 'setcpm(124/4)\nawait initHydra()\nkick: s("bd*4")\nosc(4).out()\nshape(3).out(o1)';
    expect(audioOnlyCode(code)).toBe('setcpm(124/4)\nkick: s("bd*4")');
  });
});

describe('flagLevels', () => {
  it('flags clipping, near-silence and big jumps between slides', () => {
    const rows = flagLevels([
      { slide: 1, peakDb: -6, rmsDb: -20 },
      { slide: 2, peakDb: 1.2, rmsDb: -18 },
      { slide: 3, peakDb: -30, rmsDb: -50 },
    ]);
    expect(rows.map((r) => r.flags)).toEqual([[], ['clips'], ['near silent', '-32 dB jump']]);
  });
});

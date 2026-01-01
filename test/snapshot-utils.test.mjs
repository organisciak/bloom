import { describe, it, expect } from 'vitest';
import { swapSnapshot, hasSnapshot } from '../website/src/repl/snapshot_utils.mjs';

describe('snapshot utils', () => {
  it('swaps current with snapshot', () => {
    const result = swapSnapshot('current', 'snapshot');
    expect(result.current).toBe('snapshot');
    expect(result.snapshot).toBe('current');
    expect(result.swapped).toBe(true);
  });

  it('does not swap when snapshot missing', () => {
    const result = swapSnapshot('current', '');
    expect(result.swapped).toBe(false);
    expect(result.current).toBe('current');
  });

  it('detects snapshot presence', () => {
    expect(hasSnapshot('hi')).toBe(true);
    expect(hasSnapshot('')).toBe(false);
  });
});

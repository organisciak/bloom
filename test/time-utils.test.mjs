import { describe, it, expect } from 'vitest';
import { formatElapsed } from '../website/src/repl/time_utils.mjs';

describe('time utils', () => {
  it('formats elapsed time', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(61000)).toBe('1:01');
  });

  it('handles invalid input gracefully', () => {
    // arrange: a value that could come from a glitchy timer
    const invalid = -1;

    // act: format the elapsed time
    const result = formatElapsed(invalid);

    // assert: we fall back to a safe, readable baseline
    expect(result).toBe('0:00');
  });
});

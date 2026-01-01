import { describe, it, expect } from 'vitest';
import { pickCharm } from '../website/src/repl/console_charms.mjs';

describe('pickCharm', () => {
  it('returns null for empty list', () => {
    expect(pickCharm([], null)).toBeNull();
  });

  it('returns a charm with a line', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;
    const charms = [
      { id: 'a', lines: ['one'], emoji: 'x', label: 'A', spell: 's("bd")' },
      { id: 'b', lines: ['two'], emoji: 'y', label: 'B', spell: 's("hh")' },
    ];
    const result = pickCharm(charms, null);
    expect(result.id).toBe('a');
    expect(result.line).toBe('one');
    Math.random = originalRandom;
  });

  it('avoids the last charm when possible', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;
    const charms = [
      { id: 'a', lines: ['one'], emoji: 'x', label: 'A', spell: 's("bd")' },
      { id: 'b', lines: ['two'], emoji: 'y', label: 'B', spell: 's("hh")' },
    ];
    const result = pickCharm(charms, 'a');
    expect(result.id).toBe('b');
    Math.random = originalRandom;
  });
});

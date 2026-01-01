import { describe, it, expect } from 'vitest';
import { createHistory } from '../website/src/repl/history_utils.mjs';

describe('history utils', () => {
  it('tracks history and undoes to previous entry', () => {
    const history = createHistory(3);
    history.push('a');
    history.push('a');
    history.push('b');
    history.push('c');
    expect(history.size()).toBe(3);
    const previous = history.undo();
    expect(previous).toBe('b');
    expect(history.peek()).toBe('b');
  });
});

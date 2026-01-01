import { describe, it, expect } from 'vitest';
import { normalizeClipboardText } from '../website/src/repl/clipboard_utils.mjs';

describe('clipboard utils', () => {
  it('normalizes clipboard text', () => {
    expect(normalizeClipboardText('  hi\r\nthere  ')).toBe('hi\nthere');
    expect(normalizeClipboardText('   ')).toBeNull();
  });
});

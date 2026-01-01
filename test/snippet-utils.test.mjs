import { describe, it, expect } from 'vitest';
import { toggleSnippet } from '../website/src/repl/snippet_utils.mjs';

describe('snippet utils', () => {
  it('adds and removes a snippet by marker', () => {
    const marker = '@metronome';
    const snippet = `// ${marker}\n$: s("rim*4")`;
    const initial = '$: s("bd")';
    const added = toggleSnippet({ code: initial, marker, snippet });
    expect(added).toContain(snippet);
    const removed = toggleSnippet({ code: added, marker, snippet });
    expect(removed).toContain('s("bd")');
    expect(removed).not.toContain(marker);
  });
});

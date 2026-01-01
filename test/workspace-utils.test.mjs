import { describe, it, expect } from 'vitest';
import { createUniqueFilename, isSupportedWorkspaceFile, sortWorkspaceEntries } from '../website/src/repl/workspace_utils.mjs';

describe('workspace utils', () => {
  it('identifies supported workspace files', () => {
    // arrange: file names with varying casing
    const supported = ['beat.strudel', 'notes.MD', 'sketch.Js'];
    const unsupported = ['loop.wav', 'image.png'];

    // act: check each extension
    const supportedResults = supported.map((name) => isSupportedWorkspaceFile(name));
    const unsupportedResults = unsupported.map((name) => isSupportedWorkspaceFile(name));

    // assert: supported extensions are true, others false
    supportedResults.forEach((result) => expect(result).toBe(true));
    unsupportedResults.forEach((result) => expect(result).toBe(false));
  });

  it('creates a unique filename when collisions exist', () => {
    // arrange: existing names in a folder
    const existing = new Set(['session.strudel', 'session-2.strudel']);

    // act: propose a unique name
    const result = createUniqueFilename('session.strudel', existing);

    // assert: it increments the suffix
    expect(result).toBe('session-3.strudel');
  });

  it('sorts workspace entries by path', () => {
    // arrange: unsorted entries
    const entries = [{ path: 'b/loop.strudel' }, { path: 'a/beat.strudel' }, { path: 'a/alpha.strudel' }];

    // act: sort entries
    const sorted = sortWorkspaceEntries(entries);

    // assert: entries are in lexical order
    expect(sorted.map((entry) => entry.path)).toEqual(['a/alpha.strudel', 'a/beat.strudel', 'b/loop.strudel']);
  });
});

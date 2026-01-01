import { describe, it, expect } from 'vitest';
import { buildAutosavePath, shouldPromptAutosave } from '../website/src/repl/autosave_utils.mjs';

describe('autosave utils', () => {
  it('builds a safe autosave path', () => {
    // arrange: workspace and file path with spaces
    const workspaceName = 'My Room';
    const filePath = 'beats/alpha strudel';

    // act: build the autosave path
    const result = buildAutosavePath({ workspaceName, filePath });

    // assert: path is sanitized and includes extension
    expect(result).toBe('autosaves/My-Room/beats/alpha-strudel.strudel');
  });

  it('falls back to an untitled file', () => {
    // arrange: no file path
    const result = buildAutosavePath({ workspaceName: 'room', filePath: '' });

    // assert: uses a default file name
    expect(result).toBe('autosaves/room/untitled.strudel');
  });

  it('prompts when autosave is newer and different', () => {
    // arrange: autosave newer than file
    const shouldPrompt = shouldPromptAutosave({
      autosaveLastModified: 2000,
      fileLastModified: 1000,
      autosaveText: 'new',
      fileText: 'old',
    });

    // assert: prompt should be shown
    expect(shouldPrompt).toBe(true);
  });

  it('skips prompt when autosave is older or identical', () => {
    // arrange: autosave older or identical
    const older = shouldPromptAutosave({
      autosaveLastModified: 500,
      fileLastModified: 1000,
      autosaveText: 'new',
      fileText: 'old',
    });
    const identical = shouldPromptAutosave({
      autosaveLastModified: 2000,
      fileLastModified: 1000,
      autosaveText: 'same',
      fileText: 'same',
    });

    // assert: no prompt for either case
    expect(older).toBe(false);
    expect(identical).toBe(false);
  });
});

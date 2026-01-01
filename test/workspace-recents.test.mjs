import { describe, it, expect } from 'vitest';
import { mergeWorkspaceRecent, normalizeWorkspaceRecent } from '../website/src/repl/workspace_recents.mjs';

describe('workspace recents', () => {
  it('normalizes recent entries', () => {
    // arrange: minimal recent entry
    const entry = { path: 'beats/alpha.strudel', workspaceName: 'room' };

    // act: normalize it
    const normalized = normalizeWorkspaceRecent(entry);

    // assert: name and timestamp are filled in
    expect(normalized.name).toBe('alpha.strudel');
    expect(normalized.workspaceName).toBe('room');
    expect(typeof normalized.lastOpened).toBe('number');
  });

  it('dedupes and caps recent entries', () => {
    // arrange: existing recents
    const recents = [
      { path: 'beats/a.strudel', workspaceName: 'room' },
      { path: 'pads/b.strudel', workspaceName: 'room' },
    ];

    // act: add a duplicate path
    const merged = mergeWorkspaceRecent(recents, { path: 'beats/a.strudel', workspaceName: 'room' }, 2);

    // assert: duplicate moved to top and list is capped
    expect(merged[0].path).toBe('beats/a.strudel');
    expect(merged).toHaveLength(2);
  });
});

import { describe, it, expect } from 'vitest';
import { resolveWorkspaceFileHandle } from '../website/src/repl/workspace_fs.mjs';

const makeDir = (entries = {}) => ({
  getDirectoryHandle: async (name) => {
    const entry = entries[name];
    if (!entry || entry.kind !== 'directory') {
      throw new Error('missing directory');
    }
    return entry;
  },
  getFileHandle: async (name) => {
    const entry = entries[name];
    if (!entry || entry.kind !== 'file') {
      throw new Error('missing file');
    }
    return entry;
  },
  kind: 'directory',
});

describe('workspace fs', () => {
  it('resolves a nested file handle', async () => {
    // arrange: a fake directory tree
    const fileHandle = { kind: 'file', name: 'alpha.strudel' };
    const deepDir = makeDir({ 'alpha.strudel': fileHandle });
    const root = makeDir({ beats: deepDir });

    // act: resolve the file handle by path
    const resolved = await resolveWorkspaceFileHandle(root, 'beats/alpha.strudel');

    // assert: the same file handle is returned
    expect(resolved).toBe(fileHandle);
  });
});

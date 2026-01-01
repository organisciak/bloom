import { describe, it, expect } from 'vitest';
import { buildWorkspaceTree, filterWorkspaceTree } from '../website/src/repl/workspace_tree_utils.mjs';

describe('workspace tree utils', () => {
  it('builds a nested tree from workspace entries', () => {
    // arrange: entries in nested folders
    const entries = [
      { path: 'beats/alpha.strudel', name: 'alpha.strudel' },
      { path: 'beats/deep/beta.strudel', name: 'beta.strudel' },
      { path: 'zeta.strudel', name: 'zeta.strudel' },
    ];

    // act: build the tree
    const tree = buildWorkspaceTree(entries, 'room');

    // assert: root has directory and file children
    expect(tree.name).toBe('room');
    const names = tree.children.map((child) => child.name);
    expect(names).toEqual(['beats', 'zeta.strudel']);
    const beatsNode = tree.children[0];
    expect(beatsNode.type).toBe('directory');
    expect(beatsNode.children.map((child) => child.name)).toEqual(['deep', 'alpha.strudel']);
  });

  it('filters the tree by a query', () => {
    // arrange: a tree with two files
    const entries = [
      { path: 'beats/alpha.strudel', name: 'alpha.strudel' },
      { path: 'pads/echo.strudel', name: 'echo.strudel' },
    ];
    const tree = buildWorkspaceTree(entries, 'room');

    // act: filter by a file name
    const filtered = filterWorkspaceTree(tree, 'echo');

    // assert: only matching paths remain
    const rootChildren = filtered.children.map((child) => child.name);
    expect(rootChildren).toEqual(['pads']);
    expect(filtered.children[0].children[0].name).toBe('echo.strudel');
  });
});

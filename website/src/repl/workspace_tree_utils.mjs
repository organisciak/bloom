function sortTreeNodes(nodes) {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function materializeNode(node) {
  if (!node.children) {
    return node;
  }
  const children = sortTreeNodes(node.children.values()).map(materializeNode);
  return { ...node, children };
}

export function buildWorkspaceTree(entries = [], rootName = '') {
  const root = {
    name: rootName || 'workspace',
    path: '',
    type: 'directory',
    children: new Map(),
  };

  entries.forEach((entry) => {
    if (!entry?.path) return;
    const parts = entry.path.split('/').filter(Boolean);
    let node = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      if (!node.children) {
        node.children = new Map();
      }
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: node.path ? `${node.path}/${part}` : part,
          type: isLeaf ? 'file' : 'directory',
          children: isLeaf ? null : new Map(),
          entry: isLeaf ? entry : undefined,
        });
      }
      node = node.children.get(part);
    });
  });

  return materializeNode(root);
}

export function filterWorkspaceTree(tree, query) {
  const trimmed = query?.trim();
  if (!trimmed) return tree;
  const needle = trimmed.toLowerCase();

  const matchesNode = (node) => {
    const name = node.name?.toLowerCase() ?? '';
    const path = node.path?.toLowerCase() ?? '';
    return name.includes(needle) || path.includes(needle);
  };

  const filterNode = (node) => {
    if (node.type === 'file') {
      if (matchesNode(node)) {
        return { ...node, matches: true };
      }
      return null;
    }
    const children = (node.children ?? [])
      .map(filterNode)
      .filter(Boolean);
    if (matchesNode(node) || children.length > 0) {
      return {
        ...node,
        matches: matchesNode(node),
        children,
      };
    }
    return null;
  };

  return filterNode(tree) ?? { ...tree, children: [] };
}

import { useMemo, useState } from 'react';
import cx from '@src/cx.mjs';
import { ActionButton } from '../button/action-button.jsx';
import { workspaceFileExtensions } from '../../workspace_utils.mjs';
import { buildWorkspaceTree, filterWorkspaceTree } from '../../workspace_tree_utils.mjs';

export function WorkspaceTab({ context }) {
  const {
    workspaceSupported,
    workspaceName,
    workspacePermission,
    workspaceEntries,
    workspaceLoading,
    workspaceError,
    workspaceActivePath,
    workspaceRecents,
    handleOpenWorkspace,
    handleWorkspaceRefresh,
    handleWorkspaceRequestPermission,
    handleWorkspaceOpenFile,
    handleWorkspaceOpenRecent,
    handleWorkspaceSaveNew,
    handleWorkspaceRenameFile,
    handleWorkspaceForget,
    handleWorkspaceClearRecents,
  } = context;
  const [renamingPath, setRenamingPath] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(() => new Set());

  const permissionLabel = useMemo(() => {
    if (!workspaceName) return 'no workspace selected';
    if (workspacePermission === 'granted') return 'access granted';
    if (workspacePermission === 'prompt') return 'permission needed';
    if (workspacePermission === 'denied') return 'permission denied';
    if (workspacePermission === 'unsupported') return 'permission unsupported';
    return 'access unknown';
  }, [workspaceName, workspacePermission]);

  const fileCountLabel = workspaceEntries.length ? `${workspaceEntries.length} files` : 'no files yet';

  const workspaceTree = useMemo(
    () => buildWorkspaceTree(workspaceEntries, workspaceName || 'workspace'),
    [workspaceEntries, workspaceName],
  );
  const filteredTree = useMemo(
    () => filterWorkspaceTree(workspaceTree, searchQuery),
    [workspaceTree, searchQuery],
  );
  const isSearching = Boolean(searchQuery.trim());
  const visibleRecents = useMemo(() => {
    if (!workspaceName) return [];
    return (workspaceRecents ?? []).filter((entry) => entry.workspaceName === workspaceName);
  }, [workspaceName, workspaceRecents]);

  const beginRename = (entry) => {
    setRenamingPath(entry.path);
    setRenameValue(entry.name);
  };

  const cancelRename = () => {
    setRenamingPath('');
    setRenameValue('');
  };

  const commitRename = async (entry) => {
    if (!renameValue.trim()) return;
    await handleWorkspaceRenameFile(entry, renameValue);
    cancelRename();
  };

  const toggleExpanded = (path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderTreeNode = (node, depth = 0) => {
    if (!node) return null;
    if (node.type === 'file') {
      const entry = node.entry;
      const isActive = workspaceActivePath === node.path;
      const isRenaming = renamingPath === node.path;
      return (
        <div
          key={node.path}
          className={cx('workspace-entry workspace-tree-row', isActive && 'workspace-entry--active')}
          style={{ paddingLeft: depth * 12 }}
        >
          {isRenaming ? (
            <div className="workspace-rename">
              <input
                className="workspace-rename-input"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitRename(entry);
                  }
                  if (event.key === 'Escape') {
                    cancelRename();
                  }
                }}
                aria-label={`rename ${node.path}`}
              />
              <button className="workspace-entry-action" onClick={() => commitRename(entry)}>
                save
              </button>
              <button className="workspace-entry-action" onClick={cancelRename}>
                cancel
              </button>
            </div>
          ) : (
            <>
              <button
                className="workspace-entry-name workspace-tree-file"
                onClick={() => handleWorkspaceOpenFile(entry)}
                title={`open ${node.path}`}
              >
                {node.name}
              </button>
              <button className="workspace-entry-action" onClick={() => beginRename(entry)}>
                rename
              </button>
            </>
          )}
        </div>
      );
    }

    const isExpanded = isSearching || expandedPaths.has(node.path);
    return (
      <div key={node.path || node.name} className="workspace-tree-branch">
        <div className="workspace-tree-row" style={{ paddingLeft: depth * 12 }}>
          <button
            className="workspace-tree-toggle"
            onClick={() => toggleExpanded(node.path)}
            aria-label={`${isExpanded ? 'collapse' : 'expand'} ${node.name}`}
          >
            {isExpanded ? '[-]' : '[+]'}
          </button>
          <span className="workspace-tree-folder">{node.name}</span>
        </div>
        {isExpanded &&
          node.children?.map((child) => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="px-4 py-3 flex flex-col h-full gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton
          label="open workspace"
          onClick={handleOpenWorkspace}
          disabled={!workspaceSupported}
          className={!workspaceSupported ? 'opacity-50 cursor-not-allowed' : undefined}
        />
        {workspaceName && (
          <>
            <ActionButton label="refresh" onClick={handleWorkspaceRefresh} />
            <ActionButton label="new file" onClick={handleWorkspaceSaveNew} />
            <ActionButton label="forget" onClick={handleWorkspaceForget} />
          </>
        )}
      </div>

      {!workspaceSupported && (
        <div className="text-sm opacity-70">
          This browser does not support the File System Access API. Try Chromium-based browsers for workspace features.
        </div>
      )}

      {workspaceSupported && (
      <div className="workspace-meta">
        <div className="workspace-meta-line">
            <span className="workspace-meta-label">Workspace</span>
            <span className="workspace-meta-value">{workspaceName || 'not set'}</span>
          </div>
          <div className="workspace-meta-line">
            <span className="workspace-meta-label">Access</span>
            <span className="workspace-meta-value">{permissionLabel}</span>
          </div>
          <div className="workspace-meta-line">
            <span className="workspace-meta-label">Files</span>
            <span className="workspace-meta-value">{fileCountLabel}</span>
          </div>
          <div className="workspace-meta-line">
            <span className="workspace-meta-label">Extensions</span>
            <span className="workspace-meta-value">{workspaceFileExtensions.join(', ')}</span>
          </div>
          {workspaceName && workspacePermission !== 'granted' && (
            <ActionButton
              label="grant access"
              className="workspace-permission-button"
              onClick={handleWorkspaceRequestPermission}
            />
          )}
          {workspaceError && <div className="workspace-error">{workspaceError}</div>}
        </div>
      )}

      {workspaceSupported && visibleRecents.length > 0 && (
        <div className="workspace-recents">
          <div className="workspace-recents-header">
            <span className="workspace-recents-title">Recent</span>
            <button className="workspace-entry-action" onClick={handleWorkspaceClearRecents}>
              clear
            </button>
          </div>
          <div className="workspace-recents-list">
            {visibleRecents.map((entry) => (
              <button
                key={`${entry.workspaceName}:${entry.path}`}
                className="workspace-recent"
                onClick={() => handleWorkspaceOpenRecent(entry)}
                title={`open ${entry.path}`}
              >
                <span className="workspace-recent-name">{entry.name}</span>
                <span className="workspace-recent-path">{entry.path}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {workspaceSupported && (
        <>
          <div className="workspace-search">
            <input
              className="workspace-search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search workspace..."
              aria-label="search workspace files"
            />
            {searchQuery && (
              <button className="workspace-entry-action" onClick={() => setSearchQuery('')}>
                clear
              </button>
            )}
          </div>

          <div className="workspace-list workspace-tree">
            {workspaceLoading && (
              <div className="workspace-loading">
                <span className="loading-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
                <span>Scanning workspace...</span>
              </div>
            )}
            {!workspaceLoading && workspaceName && workspacePermission === 'granted' && (
              <>
                {workspaceEntries.length === 0 && <div className="workspace-empty">No matching files yet.</div>}
                {workspaceEntries.length > 0 &&
                  filteredTree.children?.map((child) => renderTreeNode(child, 0))}
                {workspaceEntries.length > 0 && filteredTree.children?.length === 0 && (
                  <div className="workspace-empty">No matches for this search.</div>
                )}
              </>
            )}
            {!workspaceLoading && !workspaceName && (
              <div className="workspace-empty">Pick a workspace to browse files here.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

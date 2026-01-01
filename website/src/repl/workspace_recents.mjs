const STORAGE_KEY = 'strudel:workspace-recents';
export const MAX_WORKSPACE_RECENTS = 12;

export function normalizeWorkspaceRecent(entry) {
  if (!entry?.path || !entry?.workspaceName) return null;
  return {
    path: entry.path,
    name: entry.name ?? entry.path.split('/').pop() ?? entry.path,
    workspaceName: entry.workspaceName,
    lastOpened: entry.lastOpened ?? Date.now(),
  };
}

export function mergeWorkspaceRecent(recents, nextEntry, maxEntries = MAX_WORKSPACE_RECENTS) {
  const normalized = normalizeWorkspaceRecent(nextEntry);
  if (!normalized) return recents ?? [];
  const list = Array.isArray(recents) ? recents.slice() : [];
  const filtered = list.filter(
    (entry) => !(entry.path === normalized.path && entry.workspaceName === normalized.workspaceName),
  );
  return [normalized, ...filtered].slice(0, maxEntries);
}

export function loadWorkspaceRecents() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn('[workspace] failed to load recents', error);
    return [];
  }
}

export function persistWorkspaceRecents(recents) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recents ?? []));
  } catch (error) {
    console.warn('[workspace] failed to save recents', error);
  }
}

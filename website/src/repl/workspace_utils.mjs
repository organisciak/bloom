const WORKSPACE_EXTENSIONS = ['.strudel', '.js', '.txt', '.md'];

export const workspaceFileExtensions = [...WORKSPACE_EXTENSIONS];

export function isSupportedWorkspaceFile(name) {
  if (typeof name !== 'string') return false;
  const lowered = name.toLowerCase();
  return WORKSPACE_EXTENSIONS.some((ext) => lowered.endsWith(ext));
}

export function createUniqueFilename(name, existingNames) {
  const names = existingNames instanceof Set ? existingNames : new Set(existingNames ?? []);
  if (!names.has(name)) return name;

  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : '';
  let index = 2;
  let candidate = `${base}-${index}${ext}`;
  while (names.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}${ext}`;
  }
  return candidate;
}

export function sortWorkspaceEntries(entries = []) {
  return [...entries].sort((a, b) => {
    const left = a?.path ?? a?.name ?? '';
    const right = b?.path ?? b?.name ?? '';
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  });
}

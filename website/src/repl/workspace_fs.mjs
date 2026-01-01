import { isSupportedWorkspaceFile, sortWorkspaceEntries } from './workspace_utils.mjs';

export async function scanWorkspaceFiles(directoryHandle) {
  if (!directoryHandle) return [];
  const entries = [];

  const walk = async (handle, prefix = '') => {
    for await (const [name, entry] of handle.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === 'file') {
        if (isSupportedWorkspaceFile(name)) {
          entries.push({
            name,
            path,
            handle: entry,
            directoryHandle: handle,
          });
        }
      } else if (entry.kind === 'directory') {
        await walk(entry, path);
      }
    }
  };

  await walk(directoryHandle);
  return sortWorkspaceEntries(entries);
}

export async function resolveWorkspaceFileHandle(directoryHandle, path) {
  if (!directoryHandle || !path) return null;
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return null;
  let current = directoryHandle;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const isLeaf = index === parts.length - 1;
    if (isLeaf) {
      return await current.getFileHandle(part);
    }
    current = await current.getDirectoryHandle(part);
  }
  return null;
}

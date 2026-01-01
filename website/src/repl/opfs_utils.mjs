export function isOpfsSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';
}

function splitOpfsPath(path) {
  return String(path || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

async function getDirectory(root, segments) {
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }
  return current;
}

async function ensureDirectory(root, segments) {
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}

export async function writeOpfsText(path, contents) {
  if (!isOpfsSupported()) return false;
  try {
    const root = await navigator.storage.getDirectory();
    const segments = splitOpfsPath(path);
    if (!segments.length) return false;
    const fileName = segments.pop();
    const dir = await ensureDirectory(root, segments);
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    return true;
  } catch (error) {
    console.warn('[opfs] write failed', error);
    return false;
  }
}

export async function readOpfsText(path) {
  if (!isOpfsSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const segments = splitOpfsPath(path);
    if (!segments.length) return null;
    const fileName = segments.pop();
    const dir = await getDirectory(root, segments);
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    console.warn('[opfs] read failed', error);
    return null;
  }
}

export async function readOpfsFile(path) {
  if (!isOpfsSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const segments = splitOpfsPath(path);
    if (!segments.length) return null;
    const fileName = segments.pop();
    const dir = await getDirectory(root, segments);
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return {
      text: await file.text(),
      lastModified: file.lastModified ?? null,
      size: file.size ?? null,
    };
  } catch (error) {
    console.warn('[opfs] read file failed', error);
    return null;
  }
}

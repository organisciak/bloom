const DB_NAME = 'strudel-workspace';
const STORE_NAME = 'handles';
const WORKSPACE_KEY = 'workspace';

const isBrowser = typeof window !== 'undefined';
const hasIndexedDB = isBrowser && 'indexedDB' in window;

function openWorkspaceDB() {
  if (!hasIndexedDB) return null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveWorkspaceHandle(handle) {
  if (!handle || !hasIndexedDB) return false;
  try {
    const db = await openWorkspaceDB();
    if (!db) return false;
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, WORKSPACE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (error) {
    console.warn('[workspace] failed to save handle', error);
    return false;
  }
}

export async function loadWorkspaceHandle() {
  if (!hasIndexedDB) return null;
  try {
    const db = await openWorkspaceDB();
    if (!db) return null;
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(WORKSPACE_KEY);
      request.onsuccess = () => {
        db.close();
        resolve(request.result ?? null);
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (error) {
    console.warn('[workspace] failed to load handle', error);
    return null;
  }
}

export async function clearWorkspaceHandle() {
  if (!hasIndexedDB) return false;
  try {
    const db = await openWorkspaceDB();
    if (!db) return false;
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(WORKSPACE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (error) {
    console.warn('[workspace] failed to clear handle', error);
    return false;
  }
}

export async function queryWorkspacePermission(handle, mode = 'readwrite') {
  if (!handle?.queryPermission) return 'unsupported';
  try {
    return await handle.queryPermission({ mode });
  } catch (error) {
    console.warn('[workspace] failed to query permission', error);
    return 'error';
  }
}

export async function requestWorkspacePermission(handle, mode = 'readwrite') {
  if (!handle?.requestPermission) return 'unsupported';
  try {
    return await handle.requestPermission({ mode });
  } catch (error) {
    console.warn('[workspace] failed to request permission', error);
    return 'error';
  }
}

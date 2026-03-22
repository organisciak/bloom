/**
 * File watcher using polling on File System Access API handles.
 * Checks lastModified timestamp to detect external changes.
 */

const DEFAULT_POLL_MS = 500;
const DEFAULT_DEBOUNCE_MS = 300;

export function createFileWatcher({ onChanged, pollInterval = DEFAULT_POLL_MS, debounceMs = DEFAULT_DEBOUNCE_MS } = {}) {
  let fileHandle = null;
  let lastModified = 0;
  let lastSize = -1;
  let timer = null;
  let debounceTimer = null;
  let running = false;

  const poll = async () => {
    if (!running || !fileHandle) return;
    try {
      const file = await fileHandle.getFile();
      const mod = file.lastModified;
      const size = file.size;
      if (lastModified > 0 && (mod !== lastModified || size !== lastSize)) {
        lastModified = mod;
        lastSize = size;
        const text = await file.text();
        debouncedNotify(text);
      } else {
        lastModified = mod;
        lastSize = size;
      }
    } catch {
      // file may be temporarily unavailable during writes
    }
  };

  const debouncedNotify = (text) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onChanged?.(text);
    }, debounceMs);
  };

  const start = (handle) => {
    stop();
    if (!handle) return;
    fileHandle = handle;
    lastModified = 0;
    lastSize = -1;
    running = true;
    // do an initial read to seed lastModified without triggering callback
    poll();
    timer = setInterval(poll, pollInterval);
  };

  const stop = () => {
    running = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    fileHandle = null;
    lastModified = 0;
    lastSize = -1;
  };

  const isRunning = () => running;

  const getHandle = () => fileHandle;

  return { start, stop, isRunning, getHandle };
}

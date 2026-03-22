import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFileWatcher } from '../website/src/repl/file_watcher.mjs';

// helper: build a fake file handle with controllable lastModified/size/text
const makeFakeHandle = (text = 'hello', lastModified = 1000) => {
  let _text = text;
  let _mod = lastModified;
  return {
    getFile: async () => ({
      lastModified: _mod,
      size: _text.length,
      text: async () => _text,
    }),
    // test helpers to simulate external edits
    _update(newText, newMod) {
      _text = newText;
      _mod = newMod ?? _mod + 1;
    },
  };
};

describe('createFileWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onChanged when file timestamp changes', async () => {
    const onChanged = vi.fn();
    const handle = makeFakeHandle('initial', 1000);
    const watcher = createFileWatcher({ onChanged, pollInterval: 100, debounceMs: 50 });

    // start seeds lastModified without triggering callback
    watcher.start(handle);
    await vi.advanceTimersByTimeAsync(0); // flush initial poll

    expect(onChanged).not.toHaveBeenCalled();

    // simulate external edit
    handle._update('changed!', 2000);

    // advance past poll interval
    await vi.advanceTimersByTimeAsync(100);
    // advance past debounce
    await vi.advanceTimersByTimeAsync(50);

    expect(onChanged).toHaveBeenCalledWith('changed!');
    watcher.stop();
  });

  it('does not fire when file content is unchanged', async () => {
    const onChanged = vi.fn();
    const handle = makeFakeHandle('same', 1000);
    const watcher = createFileWatcher({ onChanged, pollInterval: 100, debounceMs: 50 });

    watcher.start(handle);
    await vi.advanceTimersByTimeAsync(0);

    // advance several poll cycles without changing anything
    await vi.advanceTimersByTimeAsync(500);

    expect(onChanged).not.toHaveBeenCalled();
    watcher.stop();
  });

  it('debounces rapid changes', async () => {
    const onChanged = vi.fn();
    const handle = makeFakeHandle('v1', 1000);
    const watcher = createFileWatcher({ onChanged, pollInterval: 50, debounceMs: 200 });

    watcher.start(handle);
    await vi.advanceTimersByTimeAsync(0);

    // rapid successive changes across poll intervals
    handle._update('v2', 2000);
    await vi.advanceTimersByTimeAsync(50);
    handle._update('v3', 3000);
    await vi.advanceTimersByTimeAsync(50);

    // debounce hasn't fired yet
    expect(onChanged).not.toHaveBeenCalled();

    // let debounce expire
    await vi.advanceTimersByTimeAsync(200);

    // should only fire once with last content
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledWith('v3');
    watcher.stop();
  });

  it('stops polling after stop()', async () => {
    const onChanged = vi.fn();
    const handle = makeFakeHandle('start', 1000);
    const watcher = createFileWatcher({ onChanged, pollInterval: 100, debounceMs: 50 });

    watcher.start(handle);
    await vi.advanceTimersByTimeAsync(0);

    watcher.stop();
    expect(watcher.isRunning()).toBe(false);

    // change after stop — should not fire
    handle._update('after-stop', 9000);
    await vi.advanceTimersByTimeAsync(500);

    expect(onChanged).not.toHaveBeenCalled();
  });

  it('reports running state correctly', async () => {
    const watcher = createFileWatcher({ onChanged: vi.fn() });
    const handle = makeFakeHandle('x', 1);

    expect(watcher.isRunning()).toBe(false);
    watcher.start(handle);
    expect(watcher.isRunning()).toBe(true);
    watcher.stop();
    expect(watcher.isRunning()).toBe(false);
  });

  it('detects size-only changes', async () => {
    // edge case: lastModified stays the same but size differs
    const onChanged = vi.fn();
    const handle = makeFakeHandle('ab', 1000);
    const watcher = createFileWatcher({ onChanged, pollInterval: 100, debounceMs: 50 });

    watcher.start(handle);
    await vi.advanceTimersByTimeAsync(0);

    // same timestamp, different content/size
    handle._update('abcdef', 1000);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(50);

    expect(onChanged).toHaveBeenCalledWith('abcdef');
    watcher.stop();
  });
});

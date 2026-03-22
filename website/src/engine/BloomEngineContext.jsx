/*
BloomEngineContext.jsx - Shared audio engine, pattern evaluator, and file watcher
for all Bloom mini-apps. Wraps Strudel's core repl + webaudio into a React context
so that routes like /headless and /controller can use the engine without CodeMirror.

Copyright (C) 2022 Strudel contributors
This program is free software: you can redistribute it and/or modify it under the
terms of the GNU Affero General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.
*/

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { logger, silence } from '@strudel/core';
import { evaluate, transpiler } from '@strudel/transpiler';
import {
  getAudioContextCurrentTime,
  webaudioOutput,
  resetGlobalEffects,
  resetLoadedSounds,
  initAudioOnFirstClick,
  resetDefaults,
} from '@strudel/webaudio';
import { clearHydra } from '@strudel/hydra';
import { repl } from '@strudel/core';
import { parseBoolean, settingsMap } from '../settings.mjs';
import { loadModules } from '../repl/util.mjs';
import { prebake } from '../repl/prebake.mjs';
import { createFileWatcher } from '../repl/file_watcher.mjs';
import { setInterval, clearInterval } from 'worker-timers';

const BloomEngineContext = createContext(null);

// Module-level singletons (shared across all consumers in one page)
let modulesLoading, presetsLoading, audioReady;

if (typeof window !== 'undefined') {
  const { maxPolyphony, audioDeviceName, multiChannelOrbits } = settingsMap.get();
  audioReady = initAudioOnFirstClick({
    maxPolyphony,
    audioDeviceName,
    multiChannelOrbits: parseBoolean(multiChannelOrbits),
  });
  modulesLoading = loadModules();
  presetsLoading = prebake();
}

export function BloomEngineProvider({ children }) {
  const [started, setStarted] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [tempoCps, setTempoCps] = useState(0.5);
  const [fileName, setFileName] = useState('');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [autoUpdateDetected, setAutoUpdateDetected] = useState(false);

  const replRef = useRef(null);
  const fileHandleRef = useRef(null);
  const workspaceHandleRef = useRef(null);
  const fileWatcherRef = useRef(null);

  // Create the headless repl (no CodeMirror)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (replRef.current) return;

    const r = repl({
      defaultOutput: webaudioOutput,
      getTime: getAudioContextCurrentTime,
      transpiler,
      setInterval,
      clearInterval,
      sync: false,
      beforeEval: () => audioReady,
      onToggle: (playing) => {
        setStarted(playing);
        if (!playing) {
          clearHydra();
        }
      },
      onUpdateState: (state) => {
        if (state.error) setError(state.error);
        else setError(null);
      },
      afterEval: ({ code: evalCode }) => {
        setCode(evalCode);
      },
    });

    replRef.current = r;

    // Wait for modules + prebake before allowing eval
    Promise.all([modulesLoading, presetsLoading]).then(() => {
      // Engine ready
    });
  }, []);

  const evaluateCode = useCallback(
    async (newCode) => {
      if (!replRef.current) return;
      await Promise.all([modulesLoading, presetsLoading]);
      await audioReady;
      try {
        const { pattern } = await evaluate(newCode);
        replRef.current.scheduler.setPattern(pattern, true);
        setCode(newCode);
        setTempoCps(replRef.current.scheduler.cps ?? 0.5);
        setError(null);
      } catch (err) {
        setError(err);
        logger(`[engine] eval error: ${err?.message}`, 'error');
      }
    },
    [],
  );

  const toggle = useCallback(() => {
    if (!replRef.current) return;
    const scheduler = replRef.current.scheduler;
    if (scheduler.started) {
      scheduler.stop();
    } else {
      scheduler.start();
    }
  }, []);

  const stop = useCallback(() => {
    if (!replRef.current) return;
    replRef.current.scheduler.stop();
  }, []);

  const setTempo = useCallback((cps) => {
    if (!replRef.current) return;
    replRef.current.scheduler.setCps(cps);
    setTempoCps(cps);
  }, []);

  // File watcher effect
  useEffect(() => {
    if (!autoUpdateEnabled || !fileHandleRef.current) {
      if (fileWatcherRef.current) {
        fileWatcherRef.current.stop();
        fileWatcherRef.current = null;
      }
      return;
    }
    const watcher = createFileWatcher({
      onChanged: (text) => {
        if (text === code) return;
        setAutoUpdateDetected(true);
        evaluateCode(text);
        logger('[engine] file updated externally — reloaded', 'highlight');
        setTimeout(() => setAutoUpdateDetected(false), 1500);
      },
      pollInterval: 500,
      debounceMs: 300,
    });
    watcher.start(fileHandleRef.current);
    fileWatcherRef.current = watcher;
    return () => {
      watcher.stop();
      fileWatcherRef.current = null;
    };
  }, [autoUpdateEnabled, evaluateCode, code, started]);

  const openFile = useCallback(
    async () => {
      if (typeof window === 'undefined') return;
      if (typeof window.showOpenFilePicker !== 'function') {
        logger('[engine] File System Access API not supported', 'highlight');
        return;
      }
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Strudel code', accept: { 'text/plain': ['.strudel', '.js', '.txt'] } }],
          multiple: false,
          startIn: workspaceHandleRef.current ?? 'documents',
        });
        if (!handle) return;
        const file = await handle.getFile();
        const text = await file.text();
        fileHandleRef.current = handle;
        setFileName(handle.name);
        await evaluateCode(text);
        logger(`[engine] opened ${handle.name}`, 'highlight');
      } catch (err) {
        if (err?.name === 'AbortError') return;
        logger(`[engine] open failed: ${err?.message}`, 'highlight');
      }
    },
    [evaluateCode],
  );

  const openWorkspace = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (typeof window.showDirectoryPicker !== 'function') {
      logger('[engine] Directory picker not supported', 'highlight');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      if (!handle) return;
      workspaceHandleRef.current = handle;
      logger(`[engine] workspace: ${handle.name}`, 'highlight');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      logger(`[engine] workspace failed: ${err?.message}`, 'highlight');
    }
  }, []);

  const toggleAutoUpdate = useCallback(() => {
    setAutoUpdateEnabled((prev) => !prev);
  }, []);

  const tempo = tempoCps != null ? Math.round(tempoCps * 60 * 4) : null; // CPS to BPM (4 beats per cycle)

  const value = {
    // State
    started,
    code,
    error,
    tempo,
    tempoCps,
    fileName,
    autoUpdateEnabled,
    autoUpdateDetected,
    // Actions
    toggle,
    stop,
    evaluateCode,
    setTempo,
    openFile,
    openWorkspace,
    toggleAutoUpdate,
  };

  return <BloomEngineContext.Provider value={value}>{children}</BloomEngineContext.Provider>;
}

export function useBloomEngine() {
  const ctx = useContext(BloomEngineContext);
  if (!ctx) {
    throw new Error('useBloomEngine must be used within a BloomEngineProvider');
  }
  return ctx;
}

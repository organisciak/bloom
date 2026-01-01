/*
Repl.jsx - <short description TODO>
Copyright (C) 2022 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/repl/src/App.js>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { code2hash, getPerformanceTimeSeconds, logger, silence } from '@strudel/core';
import { getDrawContext } from '@strudel/draw';
import { evaluate, transpiler } from '@strudel/transpiler';
import {
  getAudioContextCurrentTime,
  renderPatternAudio,
  webaudioOutput,
  resetGlobalEffects,
  resetLoadedSounds,
  initAudioOnFirstClick,
  resetDefaults,
  initAudio,
} from '@strudel/webaudio';
import { setVersionDefaultsFrom } from './util.mjs';
import { StrudelMirror, defaultSettings } from '@strudel/codemirror';
import { clearHydra } from '@strudel/hydra';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseBoolean, settingsMap, useSettings } from '../settings.mjs';
import {
  setActivePattern,
  setLatestCode,
  createPatternID,
  userPattern,
  getActivePattern,
  getFavoritePatterns,
  getViewingPatternData,
  setViewingPatternData,
} from '../user_pattern_utils.mjs';
import { superdirtOutput } from '@strudel/osc/superdirtoutput';
import { audioEngineTargets } from '../settings.mjs';
import { useStore } from '@nanostores/react';
import { prebake } from './prebake.mjs';
import { initCode, loadModules, shareCode } from './util.mjs';
import './Repl.css';
import { setInterval, clearInterval } from 'worker-timers';
import { getMetadata } from '../metadata_parser';
import { debugAudiograph } from './audiograph';

const { latestCode, maxPolyphony, audioDeviceName, multiChannelOrbits } = settingsMap.get();
let modulesLoading, presets, drawContext, clearCanvas, audioReady;

if (typeof window !== 'undefined') {
  audioReady = initAudioOnFirstClick({
    maxPolyphony,
    audioDeviceName,
    multiChannelOrbits: parseBoolean(multiChannelOrbits),
  });
  modulesLoading = loadModules();
  presets = prebake();
  drawContext = getDrawContext();
  clearCanvas = () => drawContext.clearRect(0, 0, drawContext.canvas.height, drawContext.canvas.width);
}

async function getModule(name) {
  if (!modulesLoading) {
    return;
  }
  const modules = await modulesLoading;
  return modules.find((m) => m.packageName === name);
}

const initialCode = `// LOADING`;

export function useReplContext() {
  const { isSyncEnabled, audioEngineTarget, prebakeScript, includePrebakeScriptInShare } = useSettings();
  const shouldUseWebaudio = audioEngineTarget !== audioEngineTargets.osc;
  const defaultOutput = shouldUseWebaudio ? webaudioOutput : superdirtOutput;
  const getTime = shouldUseWebaudio ? getAudioContextCurrentTime : getPerformanceTimeSeconds;
  const init = useCallback(() => {
    const drawTime = [-2, 2];
    const drawContext = getDrawContext();
    const editor = new StrudelMirror({
      sync: isSyncEnabled,
      defaultOutput,
      getTime,
      setInterval,
      clearInterval,
      transpiler,
      autodraw: false,
      root: containerRef.current,
      initialCode,
      pattern: silence,
      drawTime,
      drawContext,
      prebake: async () =>
        Promise.all([modulesLoading, presets]).then(() => {
          if (prebakeScript?.length) {
            return evaluate(prebakeScript ?? '');
          }
        }),
      onUpdateState: (state) => {
        setReplState({ ...state });
      },
      onToggle: (playing) => {
        if (!playing) {
          clearHydra();
        }
      },
      beforeEval: () => audioReady,
      afterEval: (all) => {
        const { code } = all;
        //post to iframe parent (like Udels) if it exists...
        window.parent?.postMessage(code);

        setLatestCode(code);
        window.location.hash = '#' + code2hash(code);
        setDocumentTitle(code);
        const viewingPatternData = getViewingPatternData();
        setVersionDefaultsFrom(code);
        const data = { ...viewingPatternData, code };
        let id = data.id;
        const isExamplePattern = viewingPatternData.collection !== userPattern.collection;

        if (isExamplePattern) {
          const codeHasChanged = code !== viewingPatternData.code;
          if (codeHasChanged) {
            // fork example
            const newPattern = userPattern.duplicate(data);
            id = newPattern.id;
            setViewingPatternData(newPattern.data);
          }
        } else {
          id = userPattern.isValidID(id) ? id : createPatternID();
          setViewingPatternData(userPattern.update(id, data).data);
        }
        setActivePattern(id);
      },
      bgFill: false,
    });
    window.strudelMirror = editor;
    window.debugAudiograph = debugAudiograph;

    // init settings
    initCode().then(async (decoded) => {
      let code, msg;
      if (decoded) {
        code = decoded;
        msg = `I have loaded the code from the URL.`;
      } else if (latestCode) {
        code = latestCode;
        msg = `Your last session has been loaded!`;
      } else {
        /* const { code: randomTune, name } = await getRandomTune();
        code = randomTune; */
        code = '$: s("[bd <hh oh>]*2").bank("tr909").dec(.4)';
        msg = `Default code has been loaded`;
      }
      editor.setCode(code);
      setDocumentTitle(code);
      logger(`Welcome to Strudel! ${msg} Press play or hit ctrl+enter to run it!`, 'highlight');
    });

    editorRef.current = editor;
  }, []);

  const [replState, setReplState] = useState({});
  const { started, isDirty, error, activeCode, pending } = replState;
  const editorRef = useRef();
  const containerRef = useRef();
  const lastRandomIdRef = useRef(null);
  const fileHandleRef = useRef(null);
  const workspaceHandleRef = useRef(null);

  // this can be simplified once SettingsTab has been refactored to change codemirrorSettings directly!
  // this will be the case when the main repl is being replaced
  const _settings = useStore(settingsMap, { keys: Object.keys(defaultSettings) });
  useEffect(() => {
    let editorSettings = {};
    Object.keys(defaultSettings).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(_settings, key)) {
        editorSettings[key] = _settings[key];
      }
    });
    editorRef.current?.updateSettings(editorSettings);
  }, [_settings]);

  //
  // UI Actions
  //

  const setDocumentTitle = (code) => {
    const meta = getMetadata(code);
    document.title = (meta.title ? `${meta.title} - ` : '') + 'Strudel REPL';
  };

  const isFileSystemAccessSupported = () =>
    typeof window !== 'undefined' &&
    typeof window.showOpenFilePicker === 'function' &&
    typeof window.showSaveFilePicker === 'function';

  const isWorkspacePickerSupported = () =>
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

  const filePickerTypes = [
    {
      description: 'Strudel code',
      accept: {
        'text/plain': ['.strudel', '.js', '.txt', '.md'],
      },
    },
  ];

  const sanitizeFileName = (value) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  };

  const getSuggestedFilename = (code) => {
    const meta = getMetadata(code);
    const base = sanitizeFileName(meta.title || 'strudel');
    return `${base || 'strudel'}.strudel`;
  };

  const getCurrentCode = () => {
    if (editorRef.current?.code != null) {
      return editorRef.current.code;
    }
    return editorRef.current?.editor?.state?.doc?.toString?.() ?? '';
  };

  const writeFileHandle = async (handle, code) => {
    const writable = await handle.createWritable();
    await writable.write(code);
    await writable.close();
  };

  const handleOpenFile = async () => {
    if (!isFileSystemAccessSupported()) {
      logger('[fs] File System Access API not supported in this browser.', 'highlight');
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: filePickerTypes,
        multiple: false,
        startIn: workspaceHandleRef.current ?? 'documents',
      });
      if (!handle) return;
      const file = await handle.getFile();
      const text = await file.text();
      fileHandleRef.current = handle;
      const nextPattern = {
        id: createPatternID(),
        code: text,
        collection: userPattern.collection,
        created_at: Date.now(),
        fileName: handle.name,
      };
      setViewingPatternData(nextPattern);
      editorRef.current?.setCode(text);
      setDocumentTitle(text);
      logger(`[fs] opened ${handle.name}`, 'highlight');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] open failed: ${error?.message || 'unknown error'}`, 'highlight');
    }
  };

  const handleSaveFileAs = async () => {
    if (!isFileSystemAccessSupported()) {
      logger('[fs] File System Access API not supported in this browser.', 'highlight');
      return;
    }
    const code = getCurrentCode();
    try {
      const handle = await window.showSaveFilePicker({
        types: filePickerTypes,
        suggestedName: getSuggestedFilename(code),
        startIn: workspaceHandleRef.current ?? 'documents',
      });
      if (!handle) return;
      await writeFileHandle(handle, code);
      fileHandleRef.current = handle;
      logger(`[fs] saved ${handle.name}`, 'highlight');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] save failed: ${error?.message || 'unknown error'}`, 'highlight');
    }
  };

  const handleSaveFile = async () => {
    if (!isFileSystemAccessSupported()) {
      logger('[fs] File System Access API not supported in this browser.', 'highlight');
      return;
    }
    const code = getCurrentCode();
    if (!fileHandleRef.current) {
      await handleSaveFileAs();
      return;
    }
    try {
      await writeFileHandle(fileHandleRef.current, code);
      logger(`[fs] saved ${fileHandleRef.current.name}`, 'highlight');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] save failed: ${error?.message || 'unknown error'}`, 'highlight');
    }
  };

  const handleOpenWorkspace = async () => {
    if (!isWorkspacePickerSupported()) {
      logger('[fs] Workspace picker not supported in this browser.', 'highlight');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker();
      if (!handle) return;
      workspaceHandleRef.current = handle;
      logger(`[fs] workspace set to ${handle.name}`, 'highlight');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] workspace failed: ${error?.message || 'unknown error'}`, 'highlight');
    }
  };

  const handleTogglePlay = async () => {
    editorRef.current?.toggle();
  };

  const resetEditor = async () => {
    (await getModule('@strudel/tonal'))?.resetVoicings();
    resetDefaults();
    resetGlobalEffects();
    clearCanvas();
    clearHydra();
    resetLoadedSounds();
    editorRef.current.repl.setCps(0.5);
    await prebake(); // declare default samples
  };

  const handleUpdate = async (patternData, reset = false) => {
    setViewingPatternData(patternData);
    editorRef.current.setCode(patternData.code);
    if (reset) {
      await resetEditor();
      handleEvaluate();
    }
  };

  const handleEvaluate = () => {
    editorRef.current.evaluate();
  };

  const handleExport = async (begin, end, sampleRate, maxPolyphony, multiChannelOrbits, downloadName = undefined) => {
    await editorRef.current.evaluate(false);
    editorRef.current.repl.scheduler.stop();
    await renderPatternAudio(
      editorRef.current.repl.state.pattern,
      editorRef.current.repl.scheduler.cps,
      begin,
      end,
      sampleRate,
      maxPolyphony,
      multiChannelOrbits,
      downloadName,
    ).finally(async () => {
      const { latestCode, maxPolyphony, audioDeviceName, multiChannelOrbits } = settingsMap.get();
      await initAudio({
        latestCode,
        maxPolyphony,
        audioDeviceName,
        multiChannelOrbits,
      });
      editorRef.current.repl.scheduler.stop();
    });
  };
  const handleShuffle = async () => {
    const favorites = getFavoritePatterns();
    const allPatterns = Object.values(userPattern.getAll());
    let candidates = favorites.length ? favorites : allPatterns;
    if (!candidates.length) {
      logger('[repl] ☆ add patterns or favorites in the Patterns tab to use random', 'highlight');
      return;
    }
    const viewingPatternId = getViewingPatternData()?.id;
    const avoid = new Set([viewingPatternId, lastRandomIdRef.current].filter(Boolean));
    if (candidates.length > 1 && avoid.size) {
      const filtered = candidates.filter((pattern) => !avoid.has(pattern.id));
      if (filtered.length) {
        candidates = filtered;
      }
    }
    const patternData = candidates[Math.floor(Math.random() * candidates.length)];
    lastRandomIdRef.current = patternData.id;
    const code = patternData.code;
    const label = favorites.length ? 'favorite' : 'pattern';
    logger(`[repl] ✨ loading random ${label} "${patternData.id}"`, 'highlight');
    setActivePattern(patternData.id);
    setViewingPatternData(patternData);
    await resetEditor();
    editorRef.current.setCode(code);
    editorRef.current.evaluate();
  };

  const handleShare = async () => {
    let code = replState.code;
    if (includePrebakeScriptInShare) {
      code = prebakeScript + '\n' + code;
    }
    shareCode(code);
  };
  const context = {
    started,
    pending,
    isDirty,
    activeCode,
    handleTogglePlay,
    handleUpdate,
    handleShuffle,
    handleShare,
    handleEvaluate,
    handleExport,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleOpenWorkspace,
    init,
    error,
    editorRef,
    containerRef,
  };
  return context;
}

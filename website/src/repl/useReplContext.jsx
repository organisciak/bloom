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
  soundMap,
} from '@strudel/webaudio';
import { setVersionDefaultsFrom, initCode, loadModules, shareCode, parseJSON } from './util.mjs';
import { StrudelMirror, defaultSettings } from '@strudel/codemirror';
import { clearHydra } from '@strudel/hydra';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseBoolean, settingsMap, useSettings } from '../settings.mjs';
import {
  setActivePattern,
  setLatestCode,
  createPatternID,
  userPattern,
  getFavoritePatterns,
  getViewingPatternData,
  setViewingPatternData,
  togglePatternFavorite,
  useViewingPatternData,
} from '../user_pattern_utils.mjs';
import { superdirtOutput } from '@strudel/osc/superdirtoutput';
import { audioEngineTargets } from '../settings.mjs';
import { useStore } from '@nanostores/react';
import { prebake } from './prebake.mjs';
import './Repl.css';
import { setInterval, clearInterval } from 'worker-timers';
import { getMetadata } from '../metadata_parser';
import { debugAudiograph } from './audiograph';
import { pickRandomPattern } from './random_utils.mjs';
import { ideaRecipes, pickIdeaRecipe } from './idea_recipes.mjs';
import { FORK_NAME } from './fork_info.mjs';
import { createTapTempo, clampTempo, cpsToCpm } from './tempo_utils.mjs';
import { nudgeRecipes, pickNudgeRecipe } from './nudge_recipes.mjs';
import { moodRecipes, pickMoodRecipe } from './mood_recipes.mjs';
import { buildPostcard } from './postcard_utils.mjs';
import { copyToClipboard, readFromClipboard } from './clipboard_utils.mjs';
import { createHistory } from './history_utils.mjs';
import { swapSnapshot, hasSnapshot } from './snapshot_utils.mjs';
import { buildMetadataBlock, hasMetadata, prependMetadataBlock } from './metadata_utils.mjs';
import { toggleSnippet } from './snippet_utils.mjs';
import { resolveWorkspaceFileHandle, scanWorkspaceFiles } from './workspace_fs.mjs';
import {
  clearWorkspaceHandle,
  loadWorkspaceHandle,
  queryWorkspacePermission,
  requestWorkspacePermission,
  saveWorkspaceHandle,
} from './workspace_storage.mjs';
import { createUniqueFilename } from './workspace_utils.mjs';
import { loadWorkspaceRecents, mergeWorkspaceRecent, persistWorkspaceRecents } from './workspace_recents.mjs';
import { buildAutosavePath, shouldPromptAutosave } from './autosave_utils.mjs';
import { isOpfsSupported, readOpfsFile, writeOpfsText } from './opfs_utils.mjs';
import { buildSoundContextFromMap } from './sound_context.mjs';

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
const METRONOME_MARKER = '@metronome';
const METRONOME_SNIPPET = `// ${METRONOME_MARKER}\n$: s("rim*4").gain(0.2).pan(0)`;

export function useReplContext() {
  const { isSyncEnabled, audioEngineTarget, prebakeScript, includePrebakeScriptInShare } = useSettings();
  const shouldUseWebaudio = audioEngineTarget !== audioEngineTargets.osc;
  const defaultOutput = shouldUseWebaudio ? webaudioOutput : superdirtOutput;
  const getTime = shouldUseWebaudio ? getAudioContextCurrentTime : getPerformanceTimeSeconds;
  const sounds = useStore(soundMap);
  const soundContext = useMemo(() => buildSoundContextFromMap(sounds), [sounds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__strudelSoundContext = soundContext;
  }, [soundContext]);
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
        historyRef.current.push(code);
        setHistoryCount(historyRef.current.size());
        setTempoCps(editorRef.current?.repl?.scheduler?.cps ?? null);
        setMetronomeEnabled(code.includes(METRONOME_MARKER));
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
      logger(`Welcome to ${FORK_NAME}! ${msg} Press play or hit ctrl+enter to run it!`, 'highlight');
    });

    editorRef.current = editor;
  }, []);

  const [replState, setReplState] = useState({});
  const { started, isDirty, error, activeCode, pending } = replState;
  const viewingPatternStore = useViewingPatternData();
  const viewingPatternData = parseJSON(viewingPatternStore);
  const isFavorite = Boolean(viewingPatternData?.favorite);
  const editorRef = useRef();
  const containerRef = useRef();
  const lastRandomIdRef = useRef(null);
  const lastIdeaIdRef = useRef(null);
  const lastNudgeIdRef = useRef(null);
  const lastMoodIdRef = useRef(null);
  const snapshotRef = useRef('');
  const tapTempoRef = useRef(createTapTempo());
  const historyRef = useRef(createHistory(20));
  const [tempoCps, setTempoCps] = useState(null);
  const [tapCount, setTapCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [hasSnapshotState, setHasSnapshotState] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionTone, setActionTone] = useState('neutral');
  const actionTimerRef = useRef(null);
  const startedRef = useRef(null);
  const fileHandleRef = useRef(null);
  const workspaceHandleRef = useRef(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspacePermission, setWorkspacePermission] = useState('unknown');
  const [workspaceEntries, setWorkspaceEntries] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceActivePath, setWorkspaceActivePath] = useState('');
  const [workspaceRecents, setWorkspaceRecents] = useState([]);
  const autosaveTimerRef = useRef(null);
  const lastAutosaveRef = useRef({ code: '', path: '' });
  const [autosavePrompt, setAutosavePrompt] = useState({
    isOpen: false,
    code: '',
    fileLabel: '',
    autosaveTime: null,
    fileTime: null,
  });

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

  const announce = useCallback((message, tone = 'neutral', { sticky = false } = {}) => {
    if (!message) return;
    setActionMessage(message);
    setActionTone(tone);
    if (actionTimerRef.current) {
      clearTimeout(actionTimerRef.current);
    }
    if (!sticky) {
      actionTimerRef.current = setTimeout(() => {
        setActionMessage('');
      }, 2200);
    }
  }, []);

  const focusEditor = () => {
    editorRef.current?.editor?.focus?.();
  };

  useEffect(() => {
    if (startedRef.current === null) {
      startedRef.current = started;
      return;
    }
    announce(started ? 'live' : 'stopped', started ? 'good' : 'neutral');
    startedRef.current = started;
  }, [announce, started]);

  useEffect(() => {
    return () => {
      if (actionTimerRef.current) {
        clearTimeout(actionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setWorkspaceRecents(loadWorkspaceRecents());
  }, []);

  //
  // UI Actions
  //

  const setDocumentTitle = (code) => {
    const meta = getMetadata(code);
    document.title = (meta.title ? `${meta.title} - ` : '') + `${FORK_NAME} REPL`;
  };

  const isFileSystemAccessSupported = () =>
    typeof window !== 'undefined' &&
    typeof window.showOpenFilePicker === 'function' &&
    typeof window.showSaveFilePicker === 'function';

  const isWorkspacePickerSupported = () =>
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

  const workspaceSupported = isWorkspacePickerSupported();

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
    const title = typeof meta.title === 'string' ? meta.title : 'strudel';
    const base = sanitizeFileName(title);
    return `${base || 'strudel'}.strudel`;
  };

  const getCurrentCode = () => {
    if (editorRef.current?.code != null) {
      return editorRef.current.code;
    }
    return editorRef.current?.editor?.state?.doc?.toString?.() ?? '';
  };

  const getCurrentCps = () => editorRef.current?.repl?.scheduler?.cps ?? null;

  const writeFileHandle = async (handle, code) => {
    const writable = await handle.createWritable();
    await writable.write(code);
    await writable.close();
  };

  const getAutosaveDescriptor = (code) => {
    const filePath = workspaceActivePath || fileHandleRef.current?.name || getSuggestedFilename(code);
    const workspaceLabel = workspaceActivePath ? workspaceName || 'workspace' : 'external';
    const autosavePath = buildAutosavePath({ workspaceName: workspaceLabel, filePath });
    return { autosavePath, autosaveKey: `${workspaceLabel}:${filePath}` };
  };

  const maybePromptAutosave = async ({ file, fileLabel, fileText, workspacePath }) => {
    if (!isOpfsSupported() || !file) return;
    const workspaceLabel = workspacePath ? workspaceName || 'workspace' : 'external';
    const autosavePath = buildAutosavePath({
      workspaceName: workspaceLabel,
      filePath: workspacePath || fileLabel || file.name || 'untitled.strudel',
    });
    const autosave = await readOpfsFile(autosavePath);
    if (!autosave?.text) return;
    const shouldPrompt = shouldPromptAutosave({
      autosaveLastModified: autosave.lastModified ?? 0,
      fileLastModified: file.lastModified ?? 0,
      autosaveText: autosave.text,
      fileText,
    });
    if (!shouldPrompt) return;
    setAutosavePrompt({
      isOpen: true,
      code: autosave.text,
      fileLabel: workspacePath || fileLabel || file.name,
      autosaveTime: autosave.lastModified ?? null,
      fileTime: file.lastModified ?? null,
    });
  };

  const handleAutosaveDismiss = () => {
    setAutosavePrompt((prev) => ({ ...prev, isOpen: false }));
  };

  const handleAutosaveRestore = () => {
    if (!autosavePrompt.code) {
      handleAutosaveDismiss();
      return;
    }
    editorRef.current?.setCode(autosavePrompt.code);
    const current = getViewingPatternData();
    if (current?.id) {
      setViewingPatternData({ ...current, code: autosavePrompt.code });
    }
    setDocumentTitle(autosavePrompt.code);
    const { autosaveKey } = getAutosaveDescriptor(autosavePrompt.code);
    lastAutosaveRef.current = { code: autosavePrompt.code, path: autosaveKey };
    announce('autosave restored', 'good');
    focusEditor();
    handleAutosaveDismiss();
  };

  const performAutosave = async (code) => {
    if (!code?.trim()) return;
    const { autosavePath, autosaveKey } = getAutosaveDescriptor(code);
    if (lastAutosaveRef.current.code === code && lastAutosaveRef.current.path === autosaveKey) {
      return;
    }
    if (isOpfsSupported()) {
      await writeOpfsText(autosavePath, code);
    }
    if (fileHandleRef.current && isFileSystemAccessSupported()) {
      try {
        await writeFileHandle(fileHandleRef.current, code);
      } catch (error) {
        logger(`[fs] autosave failed: ${error?.message || 'unknown error'}`, 'highlight');
      }
    }
    lastAutosaveRef.current = { code, path: autosaveKey };
  };

  const openFileFromHandle = async (handle, label, { workspacePath } = {}) => {
    const file = await handle.getFile();
    const text = await file.text();
    fileHandleRef.current = handle;
    setWorkspaceActivePath(workspacePath ?? '');
    const nextPattern = {
      id: createPatternID(),
      code: text,
      collection: userPattern.collection,
      created_at: Date.now(),
      fileName: label ?? handle.name,
    };
    setViewingPatternData(nextPattern);
    editorRef.current?.setCode(text);
    setDocumentTitle(text);
    logger(`[fs] opened ${label ?? handle.name}`, 'highlight');
    announce(`opened ${label ?? handle.name}`, 'good');
    focusEditor();
    await maybePromptAutosave({ file, fileLabel: label ?? handle.name, fileText: text, workspacePath });
  };

  const refreshWorkspaceEntries = useCallback(
    async (handle = workspaceHandleRef.current) => {
      if (!handle) {
        setWorkspaceEntries([]);
        setWorkspaceError('');
        return;
      }
      setWorkspaceLoading(true);
      try {
        const entries = await scanWorkspaceFiles(handle);
        setWorkspaceEntries(entries);
        setWorkspaceError('');
      } catch (error) {
        setWorkspaceEntries([]);
        setWorkspaceError(error?.message || 'Workspace scan failed');
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [setWorkspaceEntries, setWorkspaceError],
  );

  const syncWorkspacePermission = useCallback(
    async (handle, { request = false, mode = 'readwrite' } = {}) => {
      if (!handle) return 'unknown';
      const permission = request
        ? await requestWorkspacePermission(handle, mode)
        : await queryWorkspacePermission(handle, mode);
      setWorkspacePermission(permission);
      return permission;
    },
    [setWorkspacePermission],
  );

  const setWorkspaceHandle = useCallback(
    async (handle, { persist = true, requestPermission = false } = {}) => {
      workspaceHandleRef.current = handle;
      setWorkspaceName(handle?.name ?? '');
      setWorkspaceError('');
      setWorkspaceActivePath('');
      if (!handle) {
        setWorkspacePermission('unknown');
        setWorkspaceEntries([]);
        if (persist) {
          await clearWorkspaceHandle();
        }
        return 'unknown';
      }
      if (persist) {
        await saveWorkspaceHandle(handle);
      }
      const permission = await syncWorkspacePermission(handle, { request: requestPermission });
      if (permission === 'granted') {
        await refreshWorkspaceEntries(handle);
      } else {
        setWorkspaceEntries([]);
      }
      return permission;
    },
    [refreshWorkspaceEntries, syncWorkspacePermission],
  );

  const updateWorkspaceRecents = useCallback((entry) => {
    setWorkspaceRecents((prev) => {
      const next = mergeWorkspaceRecent(prev, entry);
      persistWorkspaceRecents(next);
      return next;
    });
  }, []);

  const clearWorkspaceRecents = useCallback(() => {
    setWorkspaceRecents((prev) => {
      if (!workspaceName) {
        persistWorkspaceRecents([]);
        return [];
      }
      const next = prev.filter((entry) => entry.workspaceName !== workspaceName);
      persistWorkspaceRecents(next);
      return next;
    });
  }, [workspaceName]);

  useEffect(() => {
    if (!workspaceSupported) return;
    let cancelled = false;
    const restoreWorkspace = async () => {
      const handle = await loadWorkspaceHandle();
      if (!handle || cancelled) return;
      workspaceHandleRef.current = handle;
      setWorkspaceName(handle?.name ?? '');
      const permission = await syncWorkspacePermission(handle);
      if (cancelled) return;
      if (permission === 'granted') {
        await refreshWorkspaceEntries(handle);
      } else {
        setWorkspaceEntries([]);
      }
    };
    restoreWorkspace();
    return () => {
      cancelled = true;
    };
  }, [refreshWorkspaceEntries, syncWorkspacePermission, workspaceSupported]);

  useEffect(() => {
    if (!replState.code || replState.code === initialCode || pending) {
      return;
    }
    if (!isDirty) {
      return;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      performAutosave(replState.code);
    }, 1200);
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [replState.code, isDirty, pending, workspaceActivePath, workspaceName]);

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
      await openFileFromHandle(handle, handle.name);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] open failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('open failed', 'warn');
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
      announce(`saved ${handle.name}`, 'good');
      focusEditor();
      if (workspaceHandleRef.current && workspacePermission === 'granted') {
        await refreshWorkspaceEntries();
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] save failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('save failed', 'warn');
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
      announce(`saved ${fileHandleRef.current.name}`, 'good');
      focusEditor();
      if (workspaceHandleRef.current && workspacePermission === 'granted') {
        await refreshWorkspaceEntries();
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] save failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('save failed', 'warn');
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
      const permission = await setWorkspaceHandle(handle, { requestPermission: true });
      logger(`[fs] workspace set to ${handle.name}`, 'highlight');
      announce(
        permission === 'granted' ? `workspace: ${handle.name}` : `workspace needs access`,
        permission === 'granted' ? 'good' : 'warn',
      );
      focusEditor();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      logger(`[fs] workspace failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('workspace failed', 'warn');
    }
  };

  const handleWorkspaceRequestPermission = async () => {
    const handle = workspaceHandleRef.current;
    if (!handle) return;
    const permission = await syncWorkspacePermission(handle, { request: true });
    if (permission === 'granted') {
      await refreshWorkspaceEntries(handle);
      announce('workspace access granted', 'good');
    } else {
      announce('workspace access denied', 'warn');
    }
  };

  const handleWorkspaceRefresh = async () => {
    const handle = workspaceHandleRef.current;
    if (!handle) return;
    const permission = await syncWorkspacePermission(handle);
    if (permission !== 'granted') {
      announce('workspace needs access', 'warn');
      return;
    }
    await refreshWorkspaceEntries(handle);
    announce('workspace refreshed', 'good');
  };

  const handleWorkspaceForget = async () => {
    await setWorkspaceHandle(null, { persist: true });
    announce('workspace cleared', 'neutral');
  };

  const handleWorkspaceOpenFile = async (entry) => {
    if (!entry?.handle) return;
    const permission = await syncWorkspacePermission(workspaceHandleRef.current, { request: true, mode: 'read' });
    if (permission !== 'granted') {
      announce('workspace needs access', 'warn');
      return;
    }
    try {
      await openFileFromHandle(entry.handle, entry.path, { workspacePath: entry.path });
      updateWorkspaceRecents({
        path: entry.path,
        name: entry.name,
        workspaceName: workspaceHandleRef.current?.name ?? workspaceName ?? 'workspace',
      });
    } catch (error) {
      logger(`[fs] workspace open failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('workspace open failed', 'warn');
    }
  };

  const handleWorkspaceOpenRecent = async (recent) => {
    const handle = workspaceHandleRef.current;
    if (!handle || !recent?.path) {
      announce('set a workspace first', 'warn');
      return;
    }
    const permission = await syncWorkspacePermission(handle, { request: true, mode: 'read' });
    if (permission !== 'granted') {
      announce('workspace needs access', 'warn');
      return;
    }
    try {
      const fileHandle = await resolveWorkspaceFileHandle(handle, recent.path);
      if (!fileHandle) {
        announce('recent file not found', 'warn');
        return;
      }
      await openFileFromHandle(fileHandle, recent.path, { workspacePath: recent.path });
      updateWorkspaceRecents({
        path: recent.path,
        name: recent.name ?? recent.path.split('/').pop(),
        workspaceName: handle?.name ?? workspaceName ?? 'workspace',
      });
    } catch (error) {
      logger(`[fs] recent open failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('recent open failed', 'warn');
    }
  };

  const handleWorkspaceSaveNew = async () => {
    const handle = workspaceHandleRef.current;
    if (!handle) {
      announce('set a workspace first', 'warn');
      return;
    }
    const permission = await syncWorkspacePermission(handle, { request: true });
    if (permission !== 'granted') {
      announce('workspace needs access', 'warn');
      return;
    }
    const code = getCurrentCode();
    const suggestedName = getSuggestedFilename(code);
    const existingNames = new Set(workspaceEntries.map((entry) => entry.path.split('/').pop()));
    const filename = createUniqueFilename(suggestedName, existingNames);
    try {
      const fileHandle = await handle.getFileHandle(filename, { create: true });
      await writeFileHandle(fileHandle, code);
      fileHandleRef.current = fileHandle;
      setWorkspaceActivePath(filename);
      await refreshWorkspaceEntries(handle);
      updateWorkspaceRecents({
        path: filename,
        name: filename,
        workspaceName: handle?.name ?? workspaceName ?? 'workspace',
      });
      logger(`[fs] saved ${filename}`, 'highlight');
      announce(`saved ${filename}`, 'good');
      focusEditor();
    } catch (error) {
      logger(`[fs] workspace save failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('workspace save failed', 'warn');
    }
  };

  const handleWorkspaceRenameFile = async (entry, nextName) => {
    if (!entry?.handle || !entry?.directoryHandle) return;
    const trimmed = nextName?.trim();
    if (!trimmed || trimmed === entry.name) return;
    if (trimmed.includes('/')) {
      announce('rename cannot include "/"', 'warn');
      return;
    }
    const permission = await syncWorkspacePermission(entry.directoryHandle, { request: true });
    if (permission !== 'granted') {
      announce('workspace needs access', 'warn');
      return;
    }
    try {
      const existing = await entry.directoryHandle.getFileHandle(trimmed).catch(() => null);
      if (existing) {
        announce('name already exists', 'warn');
        return;
      }
      const newHandle = await entry.directoryHandle.getFileHandle(trimmed, { create: true });
      const file = await entry.handle.getFile();
      const contents = await file.text();
      await writeFileHandle(newHandle, contents);
      await entry.directoryHandle.removeEntry(entry.name);
      if (fileHandleRef.current === entry.handle) {
        fileHandleRef.current = newHandle;
      }
      const prefix = entry.path.includes('/') ? entry.path.split('/').slice(0, -1).join('/') : '';
      const newPath = prefix ? `${prefix}/${trimmed}` : trimmed;
      if (workspaceActivePath === entry.path) {
        setWorkspaceActivePath(newPath);
      }
      await refreshWorkspaceEntries(workspaceHandleRef.current);
      logger(`[fs] renamed ${entry.name} -> ${trimmed}`, 'highlight');
      announce(`renamed to ${trimmed}`, 'good');
    } catch (error) {
      logger(`[fs] workspace rename failed: ${error?.message || 'unknown error'}`, 'highlight');
      announce('workspace rename failed', 'warn');
    }
  };

  const handleTapTempo = () => {
    const cps = tapTempoRef.current.registerTap();
    setTapCount(tapTempoRef.current.count());
    if (cps == null) return;
    const clamped = clampTempo(cps);
    if (!clamped) return;
    editorRef.current?.repl?.setCps(clamped);
    setTempoCps(clamped);
    const cpm = cpsToCpm(clamped);
    if (cpm) {
      logger(`[repl] tempo ${Math.round(cpm)} cpm`, 'highlight');
      announce(`tempo ${Math.round(cpm)} cpm`, 'good');
    }
  };

  const handleRewind = () => {
    const previous = historyRef.current.undo();
    setHistoryCount(historyRef.current.size());
    if (!previous) {
      logger('[repl] rewind: no earlier state', 'highlight');
      return;
    }
    editorRef.current?.setCode(previous);
    editorRef.current?.evaluate();
    logger('[repl] rewound one step', 'highlight');
    announce('rewound', 'good');
    focusEditor();
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
    announce('updated', 'good');
    focusEditor();
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
    const candidates = favorites.length ? favorites : allPatterns;
    if (!candidates.length) {
      logger('[repl] ☆ add patterns or favorites in the Patterns tab to use random', 'highlight');
      announce('no patterns yet', 'warn');
      return;
    }
    const viewingPatternId = getViewingPatternData()?.id;
    const patternData = pickRandomPattern({
      favorites,
      patterns: allPatterns,
      avoidIds: [viewingPatternId, lastRandomIdRef.current],
    });
    if (!patternData) {
      logger('[repl] ☆ add patterns or favorites in the Patterns tab to use random', 'highlight');
      announce('no patterns yet', 'warn');
      return;
    }
    lastRandomIdRef.current = patternData.id;
    const code = patternData.code;
    const label = favorites.length ? 'favorite' : 'pattern';
    logger(`[repl] ✨ loading random ${label} "${patternData.id}"`, 'highlight');
    setActivePattern(patternData.id);
    setViewingPatternData(patternData);
    await resetEditor();
    editorRef.current.setCode(code);
    editorRef.current.evaluate();
    announce(`random ${label}`, 'good');
    focusEditor();
  };

  const handleNudge = async () => {
    const recipe = pickNudgeRecipe(nudgeRecipes, lastNudgeIdRef.current);
    if (!recipe) {
      logger('[repl] no nudge recipes available', 'highlight');
      return;
    }
    lastNudgeIdRef.current = recipe.id;
    const prefix = editorRef.current?.code?.length ? '\n\n' : '';
    editorRef.current?.appendCode(`${prefix}${recipe.code}`);
    editorRef.current?.evaluate();
    logger(`[repl] ✨ nudge: ${recipe.title}`, 'highlight');
    announce(`nudge: ${recipe.title}`, 'good');
    focusEditor();
  };

  const handleMood = async () => {
    const recipe = pickMoodRecipe(moodRecipes, lastMoodIdRef.current);
    if (!recipe) {
      logger('[repl] no mood recipes available', 'highlight');
      return;
    }
    lastMoodIdRef.current = recipe.id;
    const prefix = editorRef.current?.code?.length ? '\n\n' : '';
    editorRef.current?.appendCode(`${prefix}${recipe.code}`);
    editorRef.current?.evaluate();
    logger(`[repl] ✨ mood: ${recipe.title}`, 'highlight');
    announce(`mood: ${recipe.title}`, 'good');
    focusEditor();
  };

  const handleIdea = async () => {
    const recipe = pickIdeaRecipe(ideaRecipes, lastIdeaIdRef.current);
    if (!recipe) {
      logger('[repl] no idea recipes available', 'highlight');
      return;
    }
    lastIdeaIdRef.current = recipe.id;
    const created = userPattern.create();
    const updated = userPattern.update(created.id, { ...created.data, code: recipe.code });
    logger(`[repl] ✨ idea: ${recipe.title}`, 'highlight');
    setActivePattern(updated.id);
    setViewingPatternData(updated.data);
    await resetEditor();
    editorRef.current.setCode(recipe.code);
    editorRef.current.evaluate();
    announce(`idea: ${recipe.title}`, 'good');
    focusEditor();
  };

  const handleSnapshot = () => {
    const code = getCurrentCode();
    if (!code?.trim()) {
      logger('[repl] snapshot needs some code', 'highlight');
      return;
    }
    snapshotRef.current = code;
    setHasSnapshotState(hasSnapshot(snapshotRef.current));
    logger('[repl] snapshot saved', 'highlight');
    announce('snapshot saved', 'good');
    focusEditor();
  };

  const handleSwapSnapshot = () => {
    const current = getCurrentCode();
    const { current: next, snapshot, swapped } = swapSnapshot(current, snapshotRef.current);
    if (!swapped) {
      logger('[repl] no snapshot to swap', 'highlight');
      return;
    }
    snapshotRef.current = snapshot;
    setHasSnapshotState(hasSnapshot(snapshotRef.current));
    editorRef.current?.setCode(next);
    setMetronomeEnabled(next.includes(METRONOME_MARKER));
    editorRef.current?.evaluate();
    logger('[repl] swapped with snapshot', 'highlight');
    announce('snapshot swapped', 'good');
    focusEditor();
  };

  const handleStampMetadata = () => {
    const code = getCurrentCode();
    const meta = getMetadata(code);
    if (hasMetadata(meta)) {
      logger('[repl] metadata already present', 'highlight');
      return;
    }
    const by = Array.isArray(meta.by) ? meta.by.join(', ') : meta.by;
    const block = buildMetadataBlock({
      title: meta.title,
      by,
      tempoCpm: cpsToCpm(getCurrentCps()),
    });
    const next = prependMetadataBlock(code, block);
    editorRef.current?.setCode(next);
    logger('[repl] metadata stamped', 'highlight');
    announce('metadata stamped', 'good');
    focusEditor();
  };

  const handlePasteFromClipboard = async () => {
    const text = await readFromClipboard();
    if (!text) {
      logger('[repl] clipboard empty or blocked', 'highlight');
      return;
    }
    editorRef.current?.setCode(text);
    setMetronomeEnabled(text.includes(METRONOME_MARKER));
    setDocumentTitle(text);
    logger('[repl] pasted from clipboard', 'highlight');
    announce('pasted', 'good');
    focusEditor();
  };

  const handleMetronome = () => {
    const code = getCurrentCode();
    const updated = toggleSnippet({ code, marker: METRONOME_MARKER, snippet: METRONOME_SNIPPET });
    editorRef.current?.setCode(updated);
    const enabled = updated.includes(METRONOME_MARKER);
    setMetronomeEnabled(enabled);
    if (started) {
      editorRef.current?.evaluate();
    }
    logger(`[repl] metronome ${enabled ? 'on' : 'off'}`, 'highlight');
    announce(`metronome ${enabled ? 'on' : 'off'}`, 'good');
    focusEditor();
  };

  const handleToggleFavorite = () => {
    const currentPattern = getViewingPatternData();
    if (!currentPattern?.id) {
      logger('[repl] no pattern to favorite', 'highlight');
      announce('no pattern to favorite', 'warn');
      return;
    }
    if (currentPattern.collection !== userPattern.collection) {
      const created = userPattern.create();
      const updated = userPattern.update(created.id, {
        ...created.data,
        code: currentPattern.code,
        favorite: true,
      });
      setViewingPatternData(updated.data);
      setActivePattern(updated.id);
      logger('[repl] ☆ saved to favorites', 'highlight');
      announce('saved to favorites', 'good');
      focusEditor();
      return;
    }
    const updated = togglePatternFavorite(currentPattern.id);
    if (!updated) {
      logger('[repl] favorite toggle failed', 'highlight');
      announce('favorite failed', 'warn');
      return;
    }
    setViewingPatternData(updated);
    logger(`[repl] ☆ ${updated.favorite ? 'favorited' : 'unfavorited'}`, 'highlight');
    announce(updated.favorite ? 'favorited' : 'unfavorited', 'good');
    focusEditor();
  };

  const handleShare = async () => {
    let code = replState.code;
    if (includePrebakeScriptInShare) {
      code = prebakeScript + '\n' + code;
    }
    shareCode(code);
    announce('link copied', 'good');
    focusEditor();
  };

  const handleCopyPostcard = async () => {
    const code = getCurrentCode();
    if (!code?.trim()) {
      logger('[repl] postcard needs some code', 'highlight');
      announce('postcard needs code', 'warn');
      return;
    }
    const postcard = buildPostcard({
      code,
      cps: getCurrentCps(),
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
    });
    const success = await copyToClipboard(postcard);
    if (success) {
      logger('[repl] postcard copied', 'highlight');
      announce('postcard copied', 'good');
      focusEditor();
    } else {
      logger('[repl] postcard copy failed', 'highlight');
      announce('postcard copy failed', 'warn');
    }
  };
  const context = {
    started,
    pending,
    isDirty,
    activeCode,
    handleTogglePlay,
    handleTapTempo,
    handleUpdate,
    handleShuffle,
    handleNudge,
    handleMood,
    handleIdea,
    handleSnapshot,
    handleSwapSnapshot,
    handleRewind,
    handleShare,
    handleStampMetadata,
    handlePasteFromClipboard,
    handleMetronome,
    handleCopyPostcard,
    handleEvaluate,
    handleExport,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleOpenWorkspace,
    handleWorkspaceRequestPermission,
    handleWorkspaceRefresh,
    handleWorkspaceOpenFile,
    handleWorkspaceOpenRecent,
    handleWorkspaceSaveNew,
    handleWorkspaceRenameFile,
    handleWorkspaceForget,
    handleWorkspaceClearRecents: clearWorkspaceRecents,
    handleToggleFavorite,
    isFavorite,
    hasSnapshot: hasSnapshotState,
    metronomeEnabled,
    tempoCps,
    tapCount,
    historyCount,
    actionMessage,
    actionTone,
    workspaceSupported,
    workspaceName,
    workspacePermission,
    workspaceEntries,
    workspaceLoading,
    workspaceError,
    workspaceActivePath,
    workspaceRecents,
    autosavePrompt,
    handleAutosaveRestore,
    handleAutosaveDismiss,
    soundContext,
    init,
    error,
    editorRef,
    containerRef,
  };
  return context;
}

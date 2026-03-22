import { useState, useRef, useCallback, useEffect } from 'react';

const DEFAULT_PARAMS = {
  tempo: 0.5,
  gain: 0.75,
  cutoff: 0.6,
  swing: 0,
  reverb: 0.3,
  delay: 0.2,
};

const PARAM_RANGES = {
  tempo: { min: 40, max: 200, unit: 'bpm', toValue: (n) => Math.round(40 + n * 160) },
  gain: { min: 0, max: 1, unit: '', toValue: (n) => n.toFixed(2) },
  cutoff: { min: 100, max: 8000, unit: 'Hz', toValue: (n) => Math.round(100 + n * 7900) },
  swing: { min: 0, max: 1, unit: '', toValue: (n) => n.toFixed(2) },
  reverb: { min: 0, max: 1, unit: '', toValue: (n) => n.toFixed(2) },
  delay: { min: 0, max: 1, unit: '', toValue: (n) => n.toFixed(2) },
};

const PAD_SUGGESTIONS = [
  { label: 'Add swing', prompt: 'Add a subtle swing feel to the rhythm' },
  { label: 'Darken mood', prompt: 'Make the overall mood darker and more moody, use minor keys and lower frequencies' },
  { label: 'Double time', prompt: 'Double the tempo feel by subdividing the rhythm' },
  { label: 'Strip to drums', prompt: 'Strip the pattern down to just the drum/percussion elements' },
  { label: 'Add melody', prompt: 'Add a simple melodic line that complements the existing pattern' },
  { label: 'Add bass', prompt: 'Add a bass line that grooves with the existing rhythm' },
  { label: 'Simplify', prompt: 'Simplify the pattern, remove complexity, make it more minimal' },
  { label: 'Go weird', prompt: 'Make the pattern more experimental and unusual, add unexpected elements' },
  { label: 'Add texture', prompt: 'Layer in ambient textures or noise elements for depth' },
  { label: 'Break it down', prompt: 'Create a breakdown section — strip elements away gradually' },
];

export function useController() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | synced | error
  const [errorMsg, setErrorMsg] = useState('');
  const [activePad, setActivePad] = useState(null);
  const fileHandleRef = useRef(null);
  const watchIntervalRef = useRef(null);

  const setParam = useCallback((name, value) => {
    setParams((prev) => ({ ...prev, [name]: Math.max(0, Math.min(1, value)) }));
  }, []);

  // --- File System Access API ---

  const openFile = useCallback(async () => {
    if (typeof window === 'undefined' || !window.showOpenFilePicker) {
      setErrorMsg('File System Access API not supported — use a Chromium browser');
      setStatus('error');
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Strudel files',
            accept: { 'text/plain': ['.strudel', '.js', '.txt'] },
          },
        ],
      });
      fileHandleRef.current = handle;
      setFileName(handle.name);
      const file = await handle.getFile();
      const text = await file.text();
      setCode(text);
      setStatus('synced');
      setErrorMsg('');
    } catch (e) {
      if (e.name !== 'AbortError') {
        setErrorMsg('Could not open file');
        setStatus('error');
      }
    }
  }, []);

  const writeFile = useCallback(
    async (newCode) => {
      const handle = fileHandleRef.current;
      if (!handle) return;
      try {
        const writable = await handle.createWritable();
        await writable.write(newCode);
        await writable.close();
        setCode(newCode);
        setStatus('synced');
      } catch (e) {
        setErrorMsg('Could not write to file');
        setStatus('error');
      }
    },
    [],
  );

  // Poll file for external changes
  useEffect(() => {
    if (!fileHandleRef.current) return;
    const poll = async () => {
      try {
        const file = await fileHandleRef.current.getFile();
        const text = await file.text();
        setCode((prev) => {
          if (text !== prev) return text;
          return prev;
        });
      } catch {
        // ignore — file may be temporarily locked
      }
    };
    watchIntervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(watchIntervalRef.current);
  }, [fileName]);

  // --- AI pad triggers ---

  const triggerPad = useCallback(
    async (index) => {
      const suggestion = PAD_SUGGESTIONS[index];
      if (!suggestion || !code) return;
      setActivePad(index);
      setStatus('loading');

      try {
        const res = await fetch('/api/claude-api', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, prompt: suggestion.prompt }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'API error');
          setStatus('error');
          setActivePad(null);
          return;
        }
        if (data.code) {
          await writeFile(data.code);
        }
        setStatus('synced');
      } catch (e) {
        setErrorMsg('Could not reach API');
        setStatus('error');
      }
      setActivePad(null);
    },
    [code, writeFile],
  );

  return {
    params,
    setParam,
    code,
    fileName,
    status,
    errorMsg,
    activePad,
    openFile,
    writeFile,
    triggerPad,
    suggestions: PAD_SUGGESTIONS,
    paramRanges: PARAM_RANGES,
  };
}

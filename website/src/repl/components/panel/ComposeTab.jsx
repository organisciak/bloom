import { useMemo, useRef, useState } from 'react';
import cx from '@src/cx.mjs';
import { nanoid } from 'nanoid';
import { logger } from '@strudel/core';
import { ActionButton, SpecialActionButton } from '../button/action-button.jsx';
import { aiPromptPresets } from '../../ai_presets.mjs';
import { getFavoritePatterns } from '../../../user_pattern_utils.mjs';
import { getMetadata } from '../../../metadata_parser.js';
import { buildApiUrl } from '../../api_utils.mjs';
import { soundMap } from '@strudel/webaudio';
import { useStore } from '@nanostores/react';
import { buildSoundContextFromMap } from '../../sound_context.mjs';

const filePickerTypes = [
  {
    description: 'Strudel code',
    accept: {
      'text/plain': ['.strudel', '.js', '.txt', '.md'],
    },
  },
];

const isFilePickerSupported = () =>
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';

const readFile = async (file) => {
  const content = await file.text();
  return {
    id: nanoid(),
    name: file.name,
    size: file.size,
    content,
  };
};

const mergeContextFiles = (prev, next) => {
  const seen = new Set(prev.map((file) => file.name));
  const merged = [...prev];
  next.forEach((file) => {
    if (!seen.has(file.name)) {
      merged.push(file);
      seen.add(file.name);
    }
  });
  return merged;
};

const sanitizeName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export function ComposeTab({ context }) {
  const sounds = useStore(soundMap);
  const soundContext = useMemo(() => buildSoundContextFromMap(sounds), [sounds]);
  const tempoCps = Number.isFinite(context?.tempoCps)
    ? context.tempoCps
    : Number.isFinite(context?.editorRef?.current?.repl?.scheduler?.cps)
      ? context.editorRef.current.repl.scheduler.cps
      : null;
  const [provider, setProvider] = useState('claude');
  const [prompt, setPrompt] = useState('');
  const [contextFiles, setContextFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const fileInputRef = useRef(null);
  const apiUrl = buildApiUrl(import.meta.env.BASE_URL, '/api/compose');

  const addContextFiles = (files) => {
    if (!files.length) return;
    setContextFiles((prev) => mergeContextFiles(prev, files));
  };

  const handleFilePicker = async () => {
    if (!isFilePickerSupported()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const handles = await window.showOpenFilePicker({ multiple: true, types: filePickerTypes });
      if (!handles?.length) return;
      const files = await Promise.all(
        handles.map(async (handle) => {
          const file = await handle.getFile();
          return readFile(file);
        }),
      );
      addContextFiles(files);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setStatus('Failed to load context files.');
    }
  };

  const handleFileInputChange = async (event) => {
    const fileList = event.target.files;
    if (!fileList?.length) return;
    const files = await Promise.all(Array.from(fileList).map((file) => readFile(file)));
    addContextFiles(files);
    event.target.value = '';
  };

  const getCurrentCode = () => {
    if (context?.editorRef?.current?.code != null) {
      return context.editorRef.current.code;
    }
    return context?.editorRef?.current?.editor?.state?.doc?.toString?.() ?? '';
  };

  const handleAddCurrent = () => {
    const code = getCurrentCode();
    if (!code.trim()) {
      setStatus('No current composition to add.');
      return;
    }
    addContextFiles([
      {
        id: nanoid(),
        name: 'current-composition.strudel',
        size: code.length,
        content: code,
      },
    ]);
  };

  const handleAddFavorites = () => {
    const favorites = getFavoritePatterns();
    if (!favorites.length) {
      setStatus('No favorite patterns found.');
      return;
    }
    const files = favorites.slice(0, 5).map((pattern) => {
      const meta = getMetadata(pattern.code);
      const title = typeof meta.title === 'string' && meta.title.trim() ? meta.title.trim() : pattern.id;
      const safeTitle = sanitizeName(title) || pattern.id;
      return {
        id: nanoid(),
        name: `favorite-${safeTitle}.strudel`,
        size: pattern.code.length,
        content: pattern.code,
      };
    });
    addContextFiles(files);
  };

  const handlePreset = (preset) => {
    if (!preset?.prompt) return;
    setPrompt((prev) => (prev?.trim() ? `${prev.trim()} ${preset.prompt}` : preset.prompt));
  };

  const handleRemoveFile = (id) => {
    setContextFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleClearFiles = () => {
    setContextFiles([]);
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setStatus('Enter a prompt to generate a composition.');
      setHasError(false);
      return;
    }
    setStatus('');
    setHasError(false);
    setIsGenerating(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          prompt: trimmedPrompt,
          contextFiles: contextFiles.map(({ name, content }) => ({ name, content })),
          soundContext,
          tempoCps,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Request failed.');
      }
      if (!data?.code) {
        throw new Error('No content generated.');
      }
      context.editorRef.current?.setCode(String(data.code));
      setStatus('Composition loaded.');
      setHasError(false);
      logger('[compose] composition generated', 'highlight');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.';
      setStatus(message);
      setHasError(true);
      logger(`[compose] ${message}`, 'highlight');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex justify-end">
        <select
          className="text-xs p-1 bg-lineHighlight rounded-md border border-foreground opacity-60 hover:opacity-100"
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          title="Generation backend"
        >
          <option value="claude">Claude</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm">Prompt</label>
        <textarea
          className="p-2 bg-background rounded-md border-foreground text-foreground min-h-[120px]"
          placeholder="Describe the full composition you want..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {aiPromptPresets.map((preset) => (
            <button
              key={preset.id}
              className="text-xs px-2 py-1 rounded-full bg-lineHighlight hover:opacity-80"
              onClick={() => handlePreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm">Context files</label>
          <div className="flex gap-2">
            <ActionButton label="add files" onClick={handleFilePicker} />
            <ActionButton label="add current" onClick={handleAddCurrent} />
            <ActionButton label="add favorites" onClick={handleAddFavorites} />
            <ActionButton label="clear" onClick={handleClearFiles} />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".strudel,.js,.txt,.md,text/plain"
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <div className="flex flex-col gap-1 rounded-md bg-background bg-opacity-50 p-2 min-h-[64px]">
          {!contextFiles.length && <span className="text-xs opacity-70">No context files added.</span>}
          {contextFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{file.name}</span>
              <button
                className="text-xs opacity-70 hover:opacity-100"
                onClick={() => handleRemoveFile(file.id)}
              >
                remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <SpecialActionButton
            label={
              isGenerating ? (
                <div className="generating-indicator">
                  <div className="loading-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <span className="generating-text">Crafting composition...</span>
                </div>
              ) : (
                'Generate composition'
              )
            }
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cx(isGenerating && 'opacity-60 cursor-not-allowed', !hasError && 'flex-1')}
          />
          {hasError && !isGenerating && (
            <ActionButton
              label="Try again"
              onClick={handleGenerate}
              className="fade-in"
            />
          )}
        </div>
        {status && <span className="text-xs opacity-80 fade-in">{status}</span>}
      </div>
    </div>
  );
}

import PlayCircleIcon from '@heroicons/react/20/solid/PlayCircleIcon';
import StopCircleIcon from '@heroicons/react/20/solid/StopCircleIcon';
import cx from '@src/cx.mjs';
import { useSettings, setIsZen } from '../../settings.mjs';
import { FORK_DIFFS, FORK_LICENSE, FORK_NAME, FORK_TAGLINE } from '../fork_info.mjs';
import { formatElapsed } from '../time_utils.mjs';
import '../Repl.css';
import { useEffect, useRef, useState } from 'react';
import { PreviewModal } from './PreviewModal';
import { AutosaveModal } from './AutosaveModal';
import { pickRandomPattern } from '../random_utils.mjs';
import { pickIdeaRecipe, ideaRecipes } from '../idea_recipes.mjs';
import { pickNudgeRecipe, nudgeRecipes } from '../nudge_recipes.mjs';
import { getFavoritePatterns, userPattern } from '../../user_pattern_utils.mjs';

const { BASE_URL } = import.meta.env;
const baseNoTrailing = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export function Header({ context, embedded = false }) {
  const {
    started,
    pending,
    isDirty,
    activeCode,
    handleTogglePlay,
    handleEvaluate,
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
    handleOpenFile,
    handleSaveFile,
    handleOpenWorkspace,
    handleToggleFavorite,
    isFavorite,
    hasSnapshot,
    metronomeEnabled,
    tempoCps,
    historyCount,
    actionMessage,
    actionTone,
    autosavePrompt,
    handleAutosaveRestore,
    handleAutosaveDismiss,
  } = context;
  const isEmbedded = typeof window !== 'undefined' && (embedded || window.location !== window.parent.location);
  const { isZen, isButtonRowHidden, isCSSAnimationDisabled, fontFamily } = useSettings();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [preview, setPreview] = useState({ isOpen: false, title: '', code: '', onApply: null, onTry: null });
  const extrasRef = useRef(null);
  const lastRandomIdRef = useRef(null);
  const lastIdeaIdRef = useRef(null);
  const lastNudgeIdRef = useRef(null);

  // Check if random button should be disabled
  const hasPatterns = () => {
    const favorites = getFavoritePatterns();
    const allPatterns = Object.values(userPattern.getAll());
    return favorites.length > 0 || allPatterns.length > 0;
  };
  const tempoCpm = Number.isFinite(tempoCps) ? Math.round(tempoCps * 60) : null;
  const pulseDurationMs = tempoCps ? Math.max(120, Math.round(1000 / tempoCps)) : 1000;
  const elapsedLabel = formatElapsed(elapsedMs);
  const metroLabel = metronomeEnabled ? 'metro on' : 'metro off';
  const statusMessage = actionMessage || (pending ? 'loading' : isDirty ? 'unsaved' : started ? 'live' : 'ready');
  const statusTone = actionMessage
    ? actionTone
    : pending || isDirty
      ? 'warn'
      : started
        ? 'good'
        : 'neutral';
  const isLive = started && !actionMessage && !pending;
  const playTitle = started ? 'stop (Alt+.)' : 'play';
  const openForkInfo = () => {
    const modal = document.getElementById('forkInfoModal');
    modal?.showModal?.();
  };
  const closeExtras = () => setExtrasOpen(false);
  const handleExtrasAction = (action) => () => {
    action?.();
    closeExtras();
  };

  const handleRandomPreview = () => {
    const favorites = getFavoritePatterns();
    const allPatterns = Object.values(userPattern.getAll());
    if (!favorites.length && !allPatterns.length) {
      handleShuffle(); // Fall back to original handler which shows the message
      return;
    }
    const patternData = pickRandomPattern({
      favorites: favorites,
      patterns: allPatterns,
      avoidIds: lastRandomIdRef.current ? [lastRandomIdRef.current] : [],
    });
    if (!patternData) return;

    lastRandomIdRef.current = patternData.id;
    const label = favorites.length ? 'favorite' : 'pattern';

    setPreview({
      isOpen: true,
      title: `Random ${label}`,
      code: patternData.code,
      onApply: () => {
        // Apply this specific pattern that was previewed
        context.editorRef.current?.setCode(patternData.code);
        context.editorRef.current?.evaluate();
      },
      onTry: null,
    });
  };

  const handleIdeaPreview = () => {
    const recipe = pickIdeaRecipe(ideaRecipes, lastIdeaIdRef.current);
    if (!recipe) {
      handleIdea(); // Fall back to original handler
      return;
    }
    lastIdeaIdRef.current = recipe.id;

    setPreview({
      isOpen: true,
      title: `Idea: ${recipe.title}`,
      code: recipe.code,
      onApply: () => {
        // Apply this specific idea recipe
        context.editorRef.current?.setCode(recipe.code);
        context.editorRef.current?.evaluate();
      },
      onTry: null,
    });
  };

  const handleNudgePreview = () => {
    const recipe = pickNudgeRecipe(nudgeRecipes, lastNudgeIdRef.current);
    if (!recipe) {
      handleNudge(); // Fall back to original handler
      return;
    }
    lastNudgeIdRef.current = recipe.id;

    setPreview({
      isOpen: true,
      title: `Nudge: ${recipe.title}`,
      code: recipe.code,
      onApply: () => {
        // Append this specific nudge recipe
        const prefix = context.editorRef.current?.code?.length ? '\n\n' : '';
        context.editorRef.current?.appendCode(`${prefix}${recipe.code}`);
        context.editorRef.current?.evaluate();
      },
      onTry: null,
    });
  };

  useEffect(() => {
    if (!started) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    setElapsedMs(0);
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 1000);
    return () => clearInterval(interval);
  }, [started]);

  useEffect(() => {
    if (!extrasOpen) return;
    const handleClick = (event) => {
      if (!extrasRef.current?.contains(event.target)) {
        setExtrasOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setExtrasOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [extrasOpen]);

  return (
    <header
      id="header"
      className={cx(
        'flex-none text-black  z-[100] text-lg select-none h-20 md:h-14',
        !isZen && !isEmbedded && 'bg-lineHighlight',
        isZen ? 'h-12 w-8 fixed top-0 left-0' : 'sticky top-0 w-full py-1 justify-between',
        isEmbedded ? 'flex' : 'md:flex',
      )}
      style={{ fontFamily }}
    >
      <div className="px-4 flex space-x-2 md:pt-0 select-none">
        <h1
          onClick={() => {
            if (isEmbedded) window.open(window.location.href.replace('embed', ''));
          }}
          className={cx(
            isEmbedded ? 'text-l cursor-pointer' : 'text-xl',
            'text-foreground font-bold flex space-x-2 items-center',
          )}
        >
          <div
            className={cx(
              'mt-[1px]',
              started && !isCSSAnimationDisabled && 'animate-spin',
              'cursor-pointer text-blue-500',
              isZen && 'fixed top-2 right-4',
            )}
            onClick={() => {
              if (!isEmbedded) {
                setIsZen(!isZen);
              }
            }}
          >
            <span className="block text-foreground rotate-90">꩜</span>
          </div>
          {!isZen && (
            <div className="space-x-2">
              <span className="">{FORK_NAME}</span>
              <span className="text-sm font-medium">REPL</span>
              {!isEmbedded && isButtonRowHidden && (
                <a href={`${baseNoTrailing}/learn`} className="text-sm opacity-25 font-medium">
                  DOCS
                </a>
              )}
            </div>
          )}
        </h1>
      </div>
      {!isZen && !isButtonRowHidden && (
        <div className="flex max-w-full overflow-auto text-foreground px-1 md:px-2">
          <button
            onClick={handleTogglePlay}
            title={playTitle}
            className={cx(
              !isEmbedded ? 'p-2' : 'px-2',
              'hover:opacity-50',
              !started && !isCSSAnimationDisabled && 'animate-pulse',
            )}
          >
            {!pending ? (
              <span className={cx('flex items-center space-x-2')}>
                {started ? <StopCircleIcon className="w-6 h-6" /> : <PlayCircleIcon className="w-6 h-6" />}
                {!isEmbedded && <span>{started ? 'stop' : 'play'}</span>}
              </span>
            ) : (
              <>loading...</>
            )}
          </button>
          {!isEmbedded && (
            <div
              className="header-tempo"
              title={tempoCpm ? `tempo ${tempoCpm} cpm` : 'tempo'}
              style={{ '--pulse-duration': `${pulseDurationMs}ms` }}
            >
              <span
                className={cx(
                  'header-pulse-dot',
                  (!started || isCSSAnimationDisabled) && 'header-pulse-dot--idle',
                )}
              />
              <span className="header-tempo-value">{tempoCpm ?? '--'}</span>
              <span className="header-tempo-label">cpm</span>
            </div>
          )}
          {!isEmbedded && (
            <div className="header-timer" title="performance timer">
              <span className="header-timer-label">time</span>
              <span className="header-timer-value">{elapsedLabel}</span>
            </div>
          )}
          {!isEmbedded && (
            <div
              className={cx(
                'header-status',
                statusTone === 'good' && 'header-status--good',
                statusTone === 'warn' && 'header-status--warn',
                actionMessage && 'header-status--active',
                isLive && 'header-status--live',
              )}
              aria-live="polite"
            >
              <span className="header-status-label">{statusMessage}</span>
            </div>
          )}
          <button
            onClick={handleEvaluate}
            title="update (Ctrl+Enter)"
            className={cx(
              'flex items-center space-x-1',
              !isEmbedded ? 'p-2' : 'px-2',
              !isDirty || !activeCode ? 'opacity-50' : 'hover:opacity-50',
            )}
          >
            {!isEmbedded && (
              <span className="header-update-label">
                update
                {isDirty && <span className="header-update-dot" aria-hidden="true" />}
              </span>
            )}
          </button>
          {!isEmbedded && (
            <button
              title="rewind to previous eval"
              className={cx(
                'p-2 flex items-center space-x-1',
                historyCount < 2 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-50',
              )}
              onClick={handleRewind}
              disabled={historyCount < 2}
            >
              <span>rewind</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title="open file"
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={handleOpenFile}
            >
              <span>open</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title="save file"
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={handleSaveFile}
            >
              <span>save</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title="set workspace folder"
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={handleOpenWorkspace}
            >
              <span>workspace</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title={hasPatterns() ? "random (favorites first) - preview before applying" : "no patterns saved yet"}
              className={cx(
                "p-2 flex items-center space-x-1",
                hasPatterns() ? "hover:opacity-50" : "opacity-30 cursor-not-allowed"
              )}
              onClick={handleRandomPreview}
              disabled={!hasPatterns()}
            >
              <span>random</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title="idea deck - preview before applying"
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={handleIdeaPreview}
            >
              <span>idea</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title="micro-nudge - preview before applying"
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={handleNudgePreview}
            >
              <span>nudge</span>
            </button>
          )}
          {!isEmbedded && (
            <div className="header-tools" ref={extrasRef}>
              <button
                className="header-tools-summary"
                onClick={() => setExtrasOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={extrasOpen}
                type="button"
              >
                extras
              </button>
              {extrasOpen && (
                <div className="header-tools-menu" role="menu">
                  <button
                    title="mood deck"
                    className="header-tools-button"
                    onClick={handleExtrasAction(handleMood)}
                    type="button"
                  >
                    mood
                  </button>
                  <button
                    title="save snapshot"
                    className="header-tools-button"
                    onClick={handleExtrasAction(handleSnapshot)}
                    type="button"
                  >
                    snap
                  </button>
                  <button
                    title="swap with snapshot"
                    className={cx('header-tools-button', !hasSnapshot && 'header-tools-button--disabled')}
                    onClick={handleExtrasAction(handleSwapSnapshot)}
                    disabled={!hasSnapshot}
                    type="button"
                  >
                    swap
                  </button>
                  <button
                    title="stamp metadata block"
                    className="header-tools-button"
                    onClick={handleExtrasAction(handleStampMetadata)}
                    type="button"
                  >
                    stamp
                  </button>
                  <button
                    title="paste from clipboard"
                    className="header-tools-button"
                    onClick={handleExtrasAction(handlePasteFromClipboard)}
                    type="button"
                  >
                    paste
                  </button>
                  <button
                    title="toggle metronome track"
                    className="header-tools-button"
                    onClick={handleExtrasAction(handleMetronome)}
                    type="button"
                  >
                    {metroLabel}
                  </button>
                </div>
              )}
            </div>
          )}
          {!isEmbedded && (
            <button
              title={isFavorite ? 'unfavorite' : 'favorite'}
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={handleToggleFavorite}
            >
              <span>{isFavorite ? '★' : '☆'}</span>
              <span>favorite</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title="copy postcard"
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={handleCopyPostcard}
            >
              <span>postcard</span>
            </button>
          )}
          {!isEmbedded && (
            <button
              title="share"
              className={cx(
                'cursor-pointer hover:opacity-50 flex items-center space-x-1',
                !isEmbedded ? 'p-2' : 'px-2',
              )}
              onClick={handleShare}
            >
              <span>share</span>
            </button>
          )}
          {!isEmbedded && (
            <a
              title="learn"
              href={`${baseNoTrailing}/workshop/getting-started/`}
              className={cx('hover:opacity-50 flex items-center space-x-1', !isEmbedded ? 'p-2' : 'px-2')}
            >
              <span>learn</span>
            </a>
          )}
          {!isEmbedded && (
            <button
              title="about this fork"
              className="hover:opacity-50 p-2 flex items-center space-x-1"
              onClick={openForkInfo}
            >
              <span>about</span>
            </button>
          )}
          {/* {isEmbedded && (
            <button className={cx('hover:opacity-50 px-2')}>
              <a href={window.location.href} target="_blank" rel="noopener noreferrer" title="Open in REPL">
                🚀
              </a>
            </button>
          )}
          {isEmbedded && (
            <button className={cx('hover:opacity-50 px-2')}>
              <a
                onClick={() => {
                  window.location.href = initialUrl;
                  window.location.reload();
                }}
                title="Reset"
              >
                💔
              </a>
            </button>
          )} */}
        </div>
      )}
      <dialog
        id="forkInfoModal"
        className="fork-modal text-md bg-background text-foreground rounded-lg backdrop:bg-background backdrop:opacity-25"
      >
        <div className="fork-modal-content">
          <h2 className="fork-modal-title">{FORK_NAME}</h2>
          <p className="fork-modal-tagline">{FORK_TAGLINE}</p>
          <p>
            I adore the original Strudel and Hydra. This fork is made for my own flow and joy, and I hope others like it
            too. It’s a fork, it’s humble about it, and it’s unapologetically vibe‑coded.
          </p>
          <ul>
            {FORK_DIFFS.map((item) => (
              <li key={item.title}>
                <strong>{item.title}:</strong> {item.body}
              </li>
            ))}
          </ul>
          <p>
            I won’t be sending this code upstream. If you want any of it in Strudel or Hydra, you’re welcome to borrow
            the ideas or re‑implement them cleanly.
          </p>
          <p className="fork-modal-license">License: {FORK_LICENSE}</p>
          <form method="dialog" className="fork-modal-actions">
            <button className="fork-modal-button" type="submit">
              close
            </button>
          </form>
        </div>
      </dialog>

      <PreviewModal
        isOpen={preview.isOpen}
        onClose={() => setPreview({ ...preview, isOpen: false })}
        onApply={preview.onApply}
        onTry={preview.onTry}
        title={preview.title}
        code={preview.code}
      />

      <AutosaveModal
        isOpen={autosavePrompt?.isOpen}
        onClose={handleAutosaveDismiss}
        onRestore={handleAutosaveRestore}
        fileLabel={autosavePrompt?.fileLabel}
        autosaveTime={autosavePrompt?.autosaveTime}
        fileTime={autosavePrompt?.fileTime}
        code={autosavePrompt?.code}
      />
    </header>
  );
}

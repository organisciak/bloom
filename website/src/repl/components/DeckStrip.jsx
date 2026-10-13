/*
DeckStrip - the strip above the code when the file is a slide deck.

In slide view it shows the slide's text, prev/next and a row of dots; in code
and text view it is a thin bar for switching views. Keys while presenting:
Alt+←/→ or PageUp/PageDown anywhere, plain ←/→ when the editor is not focused.
*/
import { useEffect, useMemo } from 'react';
import cx from '@src/cx.mjs';
import { renderMarkdown } from '../deck_markdown.mjs';
import './Deck.css';

function ViewSwitch({ view, onCode, onText, onSlides }) {
  const item = (name, label, onClick) => (
    <button
      type="button"
      className={cx('deck-switch-button', view === name && 'deck-switch-button--active')}
      aria-pressed={view === name}
      onClick={onClick}
    >
      {label}
    </button>
  );
  return (
    <div className="deck-switch" role="group" aria-label="Deck view">
      {item('code', 'code', onCode)}
      {item('text', 'text', onText)}
      {item('slides', 'slides', onSlides)}
    </div>
  );
}

function isTyping(target) {
  return Boolean(target?.closest?.('.cm-editor, input, textarea, select, [contenteditable="true"]'));
}

export function DeckStrip({ context }) {
  const { deck, deckError, deckView, slideIndex, presentSlide, stepSlide, showDeckText, showDeckCode } = context;
  const slides = deck?.slides ?? [];
  const slide = slides[slideIndex];
  const presenting = deckView === 'slides';
  const html = useMemo(() => (presenting && slide ? renderMarkdown(slide.prose) : ''), [presenting, slide]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e) => {
      const forward = e.key === 'PageDown' || (e.key === 'ArrowRight' && (e.altKey || !isTyping(e.target)));
      const back = e.key === 'PageUp' || (e.key === 'ArrowLeft' && (e.altKey || !isTyping(e.target)));
      if (!forward && !back) return;
      e.preventDefault();
      stepSlide(forward ? 1 : -1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [presenting, stepSlide]);

  if (!deck) return null;
  const errorNote = deckError ? `slide ${(deckError.slide ?? 0) + 1}: ${deckError.message}` : null;
  const switcher = (
    <ViewSwitch view={deckView} onCode={showDeckCode} onText={showDeckText} onSlides={() => presentSlide(slideIndex)} />
  );

  if (!presenting) {
    return (
      <div className="deck-bar">
        <span className="deck-bar-label">deck · {slides.length} slides</span>
        {errorNote && <span className="deck-error">{errorNote}</span>}
        <span className="grow" />
        {switcher}
      </div>
    );
  }

  return (
    <section className="deck-strip" aria-label={`Slide ${slideIndex + 1} of ${slides.length}`}>
      <div className="deck-strip-top">
        <button
          type="button"
          className="deck-nav"
          onClick={() => stepSlide(-1)}
          disabled={slideIndex === 0}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <span className="deck-count">
          {slideIndex + 1} / {slides.length}
        </span>
        <button
          type="button"
          className="deck-nav"
          onClick={() => stepSlide(1)}
          disabled={slideIndex >= slides.length - 1}
          aria-label="Next slide"
        >
          ›
        </button>
        <div className="deck-dots">
          {slides.map((s, i) => (
            <button
              type="button"
              key={i}
              className={cx('deck-dot', i === slideIndex && 'deck-dot--active', i < slideIndex && 'deck-dot--past')}
              title={`${i + 1}. ${s.title}`}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              onClick={() => presentSlide(i)}
            />
          ))}
        </div>
        {errorNote && <span className="deck-error">{errorNote}</span>}
        <span className="grow" />
        {switcher}
      </div>
      {html ? (
        <div key={slideIndex} className="deck-prose" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div key={slideIndex} className="deck-prose deck-prose--empty">
          {slide?.title || 'No text on this slide.'}
        </div>
      )}
    </section>
  );
}

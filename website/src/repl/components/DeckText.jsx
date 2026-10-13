/*
DeckText - the reading view of a deck: each slide's text as formatted prose,
followed by the code that slide writes. Click "play from here" to present.
*/
import { useMemo } from 'react';
import { renderMarkdown } from '../deck_markdown.mjs';
import './Deck.css';

export function DeckText({ context }) {
  const { deck, deckView, presentSlide } = context;
  const slides = deck?.slides ?? [];
  const rendered = useMemo(() => slides.map((s) => renderMarkdown(s.prose)), [slides]);
  if (!deck || deckView !== 'text') return null;
  return (
    <div className="deck-text">
      <article className="deck-text-inner">
        {slides.map((slide, i) => (
          <section key={i} className="deck-text-slide">
            <div className="deck-text-meta">
              <span>slide {i + 1}</span>
              <button type="button" className="deck-text-play" onClick={() => presentSlide(i)}>
                present from here ›
              </button>
            </div>
            {rendered[i] && <div className="deck-prose" dangerouslySetInnerHTML={{ __html: rendered[i] }} />}
            {slide.patch && (
              <pre className="deck-text-code">
                <code>{slide.patch}</code>
              </pre>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}

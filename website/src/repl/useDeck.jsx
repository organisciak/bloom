/*
useDeck.jsx - slide decks in the main REPL (see packages/transpiler/deck.mjs).

Three views of the same file:
  code    the editor shows the deck file as written
  text    a reading view: slide text as formatted prose, code in blocks
  slides  one slide at a time; the editor holds that slide's full code, so
          highlighting, sliders and live tweaks work as usual

While in slide view, `deckRef.current.source` is the real file. The REPL reads
it instead of the editor for saving, autosave, history and sharing, so the deck
on disk never gets replaced by one slide.
*/
import { useCallback, useMemo, useRef, useState } from 'react';
import { diffLines, isDeck, parseDeck, playableCode } from '@strudel/transpiler';

export function useDeck({ editorRef, code, announce }) {
  // { source, shown, index } while the editor holds a single slide
  const deckRef = useRef(null);
  const [view, setView] = useState('code');
  const [source, setSource] = useState(null);
  const [index, setIndex] = useState(0);
  const lastGoodRef = useRef(null);

  const text = view === 'slides' ? source : code;
  const parsed = useMemo(() => (isDeck(text) ? parseDeck(text) : null), [text]);
  // keep showing the last good deck while a slide is mid-edit
  if (parsed && !parsed.error) lastGoodRef.current = parsed;
  if (!parsed) lastGoodRef.current = null;
  const deck = parsed ? lastGoodRef.current : null;
  const deckError = parsed?.error ?? null;

  const present = useCallback(
    (target, nextSource) => {
      const editor = editorRef.current;
      if (!editor) return false;
      const src = nextSource ?? deckRef.current?.source ?? editor.code;
      const { slides, error } = parseDeck(src);
      if (error || !slides.length) {
        announce(error ? `deck error on slide ${(error.slide ?? 0) + 1}` : 'nothing to present', 'warn');
        return false;
      }
      const i = Math.min(Math.max(target, 0), slides.length - 1);
      const next = slides[i].code;
      const before = deckRef.current?.shown ?? (i > 0 ? slides[i - 1].code : '');
      deckRef.current = { source: src, shown: next, index: i };
      setSource(src);
      setIndex(i);
      setView('slides');
      editor.setCodeRaw(next);
      editor.setSlideDiff(diffLines(before, next));
      if (editor.repl?.scheduler?.started) editor.evaluate();
      return true;
    },
    [editorRef, announce],
  );

  const step = useCallback((delta) => present((deckRef.current?.index ?? 0) + delta), [present]);

  // back to the file as written, with the cursor on the slide we were showing
  const leave = useCallback(
    (nextView = 'code') => {
      const editor = editorRef.current;
      const current = deckRef.current;
      deckRef.current = null;
      if (current && editor) {
        editor.setCodeRaw(current.source);
        const slide = parseDeck(current.source).slides[current.index];
        if (slide) {
          editor.editor.dispatch({ selection: { anchor: slide.start }, scrollIntoView: true });
        }
      }
      setSource(null);
      setView(nextView);
    },
    [editorRef],
  );

  const showText = useCallback(() => (deckRef.current ? leave('text') : setView('text')), [leave]);
  const showCode = useCallback(() => (deckRef.current ? leave('code') : setView('code')), [leave]);

  // Called once from the REPL's init with the new StrudelMirror
  const attach = useCallback((editor) => {
    const setCodeRaw = editor.setCode.bind(editor);
    editor.setCodeRaw = setCodeRaw;
    // anything else replacing the code (open file, shuffle, …) ends the presentation
    editor.setCode = (next) => {
      if (deckRef.current) {
        deckRef.current = null;
        setSource(null);
        setView('code');
      }
      setCodeRaw(next);
    };
    editor.transformCode = (text, mirror) => (deckRef.current ? text : playableCode(text, mirror.getCursorLocation()));
  }, []);

  // The file changed on disk while presenting: re-show the same slide from the new source
  const reloadSource = useCallback(
    (nextSource) => {
      if (!deckRef.current || nextSource === deckRef.current.source) return false;
      present(deckRef.current.index, nextSource);
      return true;
    },
    [present],
  );

  return {
    deckRef,
    deck,
    deckError,
    deckView: deck ? view : 'code',
    slideIndex: index,
    presentSlide: present,
    stepSlide: step,
    showDeckText: showText,
    showDeckCode: showCode,
    attachDeck: attach,
    reloadDeckSource: reloadSource,
  };
}

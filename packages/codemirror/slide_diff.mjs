/*
slide_diff.mjs - show what changed between deck slides.

Lines added since the previous slide get a green edge, changed lines an amber
one (both with a short glow), and removed lines appear struck through for a
moment before folding away. Typing in the editor clears the marks, so live
tweaks are not mistaken for slide changes.
*/
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

export const setSlideDiff = StateEffect.define();

class RemovedLinesWidget extends WidgetType {
  constructor(lines) {
    super();
    this.lines = lines;
  }
  eq(other) {
    return other.lines.join('\n') === this.lines.join('\n');
  }
  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-slide-removed';
    wrap.setAttribute('aria-label', 'removed since the previous slide');
    for (const line of this.lines) {
      const row = document.createElement('div');
      row.textContent = line || ' ';
      wrap.appendChild(row);
    }
    return wrap;
  }
  ignoreEvent() {
    return true;
  }
}

// diff: { added: [line], changed: [line], removed: [{ before, lines }] } from diffLines()
export function buildSlideDiffDecorations(doc, diff) {
  if (!diff) return Decoration.none;
  const ranges = [];
  const lineAt = (n) => doc.line(Math.min(Math.max(n, 1), doc.lines));
  for (const n of diff.added ?? []) {
    if (n <= doc.lines) ranges.push(Decoration.line({ class: 'cm-slide-added' }).range(lineAt(n).from));
  }
  for (const n of diff.changed ?? []) {
    if (n <= doc.lines) ranges.push(Decoration.line({ class: 'cm-slide-changed' }).range(lineAt(n).from));
  }
  for (const { before, lines } of diff.removed ?? []) {
    const atEnd = before > doc.lines;
    const pos = atEnd ? doc.length : lineAt(before).from;
    const widget = Decoration.widget({ widget: new RemovedLinesWidget(lines), block: true, side: atEnd ? 1 : -1 });
    ranges.push(widget.range(pos));
  }
  return Decoration.set(ranges, true);
}

export const slideDiffField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(setSlideDiff)) return buildSlideDiffDecorations(tr.state.doc, e.value);
    }
    return tr.docChanged ? Decoration.none : decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const slideDiffTheme = EditorView.baseTheme({
  '.cm-slide-added': {
    boxShadow: 'inset 3px 0 0 #4ade80',
    animation: 'cm-slide-glow-added 2.4s ease-out',
  },
  '.cm-slide-changed': {
    boxShadow: 'inset 3px 0 0 #fbbf24',
    animation: 'cm-slide-glow-changed 2.4s ease-out',
  },
  '.cm-slide-removed': {
    color: '#f87171',
    textDecoration: 'line-through',
    opacity: '0',
    overflow: 'hidden',
    maxHeight: '0',
    animation: 'cm-slide-removed 2.8s ease-in',
    paddingLeft: '6px',
  },
  '@keyframes cm-slide-glow-added': {
    from: { backgroundColor: 'rgba(74, 222, 128, 0.28)' },
    to: { backgroundColor: 'transparent' },
  },
  '@keyframes cm-slide-glow-changed': {
    from: { backgroundColor: 'rgba(251, 191, 36, 0.28)' },
    to: { backgroundColor: 'transparent' },
  },
  '@keyframes cm-slide-removed': {
    '0%': { opacity: '0.85', maxHeight: '20em' },
    '70%': { opacity: '0.6', maxHeight: '20em' },
    '100%': { opacity: '0', maxHeight: '0' },
  },
});

export const slideDiff = [slideDiffField, slideDiffTheme];

export function showSlideDiff(view, diff) {
  view.dispatch({ effects: setSlideDiff.of(diff) });
}

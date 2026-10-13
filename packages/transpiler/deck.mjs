/*
deck.mjs - slide decks written as one Strudel file.

A deck is ordinary Strudel code with `// ---` lines between slides. Each slide
starts with comments (its text, read as Markdown), then code. Slide 1 holds the
full code; every later slide is a patch that only lists what changes:

  kick: s("bd*4")        replaces the `kick` layer, or adds it if it is new
  kick: silence          removes the `kick` layer
  _kick: s("bd*4")       replaces `kick` with a muted copy
  const chords = ...     keyed by the variable name
  setcpm(124/4)          top-level calls are keyed by function name
  osc(4).out(o1)         Hydra chains are keyed by their output (o0 if none)
  $: s("hh*8")           anonymous layers always append

Resolving a slide applies the patches in order and returns the full code, so
each slide plays on its own. Keys are names, never line numbers, so editing an
early slide does not break later ones.
*/
import { parse, tokenizer } from 'acorn';

const MARKER = /^\s*-{3,}\s*$/;
const PARSE_OPTIONS = { ecmaVersion: 'latest', allowAwaitOutsideFunction: true };

// True when the file has at least one `// ---` slide marker on a line of its own
export function isDeck(code) {
  return typeof code === 'string' && /^[ \t]*\/\/[ \t]*-{3,}[ \t]*$/m.test(code);
}

function lineStart(code, pos) {
  return code.lastIndexOf('\n', pos - 1) + 1;
}

function lineEnd(code, pos) {
  const end = code.indexOf('\n', pos);
  return end === -1 ? code.length : end;
}

// Comment text without the comment syntax: `// a` -> `a`, `/* * a */` -> `a`
function commentText(comment) {
  if (comment.type === 'Line') {
    return comment.value.replace(/^ /, '');
  }
  return comment.value
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, ''))
    .join('\n')
    .trim();
}

function unwrapAwait(node) {
  return node?.type === 'AwaitExpression' ? node.argument : node;
}

function calleeName(callee, code) {
  if (callee.type === 'Identifier') return callee.name;
  return code.slice(callee.start, callee.end);
}

// The name a statement is matched by across slides
export function statementKey(node, code) {
  if (node.type === 'LabeledStatement') {
    const name = node.label.name;
    if (name.includes('$')) return null; // anonymous: always appends
    return name.replace(/^_+|_+$/g, '');
  }
  if (node.type === 'VariableDeclaration') {
    return node.declarations.map((d) => code.slice(d.id.start, d.id.end)).join(',');
  }
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
    return node.id?.name ?? null;
  }
  if (node.type === 'ExpressionStatement') {
    const expr = unwrapAwait(node.expression);
    if (expr?.type === 'CallExpression') {
      const { callee } = expr;
      // Hydra: osc().rotate().out(o1) is identified by the output it draws to
      if (callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'out') {
        const target = expr.arguments[0];
        return `out:${target ? code.slice(target.start, target.end) : 'o0'}`;
      }
      if (callee.type === 'Identifier' || callee.type === 'MemberExpression') {
        // only plain calls like setcpm(...) or s0.initCam(...), not pattern chains
        const root = callee.type === 'MemberExpression' ? callee.object : callee;
        if (root.type === 'Identifier' || root.type === 'MemberExpression') {
          return `${calleeName(callee, code)}()`;
        }
      }
    }
  }
  return null;
}

// `name: silence` removes the layer
function isRemoval(node) {
  return (
    node.type === 'LabeledStatement' &&
    node.body.type === 'ExpressionStatement' &&
    node.body.expression.type === 'Identifier' &&
    node.body.expression.name === 'silence'
  );
}

function slideTitle(prose) {
  const heading = prose.match(/^#{1,6}\s+(.+)$/m);
  if (heading) return heading[1].trim();
  const first = prose.split('\n').find((l) => l.trim());
  return first ? first.trim() : '';
}

// Read one slide's source: its prose, and its statements with their keys
function readSlide(src) {
  const comments = [];
  const body = parse(src, { ...PARSE_OPTIONS, onComment: comments }).body;
  const firstStatement = body[0]?.start ?? src.length;
  const proseComments = comments.filter((c) => c.end <= firstStatement);
  const prose = proseComments
    .map(commentText)
    .filter((line) => !/^\s*@\w+/.test(line)) // Strudel metadata like `// @title`
    .join('\n')
    .trim();
  const codeStart = proseComments.length ? lineEnd(src, proseComments.at(-1).end) : 0;

  let cursor = codeStart;
  const statements = body.map((node, i) => {
    // a statement owns the comments just above it and a comment after it on its last line
    const next = body[i + 1]?.start ?? src.length;
    const leading = comments.find((c) => c.start >= cursor && c.end <= node.start);
    let begin = Math.max(cursor, lineStart(src, leading ? leading.start : node.start));
    if (begin > lineStart(src, begin)) begin = node.start; // shares a line with the previous statement
    const trailing = comments.find((c) => c.start >= node.end && c.start < lineEnd(src, node.end) && c.end <= next);
    const finish = trailing ? trailing.end : node.end;
    const gap = src.slice(cursor, begin);
    cursor = finish;
    return {
      key: statementKey(node, src),
      text: src.slice(begin, finish).replace(/^\s*\n/, ''),
      spaced: i > 0 && /\n[ \t]*\n/.test(gap),
      remove: isRemoval(node),
    };
  });
  return { title: slideTitle(prose), prose, patch: src.slice(codeStart).trim(), statements };
}

/*
Split a deck into slides. Returns { slides, error }. Each slide has:
  title, prose (Markdown), patch (the code written on that slide),
  statements [{ key, text, spaced, remove }], start/end offsets in the source.
Slides are parsed one at a time, so `const x` can be redefined on a later
slide, and an error names the slide it is on (error.slide, 0-based).
*/
export function splitDeck(code) {
  // The tokenizer finds comments while skipping strings and template literals
  const comments = [];
  try {
    for (const _token of tokenizer(code, { ...PARSE_OPTIONS, onComment: comments }));
  } catch (error) {
    return { slides: [], error };
  }
  const markers = comments.filter(
    (c) => c.type === 'Line' && MARKER.test(c.value) && !code.slice(lineStart(code, c.start), c.start).trim(),
  );

  const bounds = [];
  let from = 0;
  for (const m of markers) {
    bounds.push([from, lineStart(code, m.start)]);
    from = lineEnd(code, m.end);
  }
  bounds.push([from, code.length]);

  const slides = [];
  for (const [index, [start, end]] of bounds.entries()) {
    try {
      slides.push({ ...readSlide(code.slice(start, end)), start, end });
    } catch (error) {
      error.slide = index;
      return { slides: [], error };
    }
  }
  return { slides, error: null };
}

/*
Resolve every slide to the full code it plays. Returns { slides, error }, where
each slide also gets `code` (the full code) and `changes`
[{ key, kind: 'add' | 'change' | 'remove' }].
*/
export function parseDeck(code) {
  const { slides, error } = splitDeck(code);
  if (error) return { slides: [], error };
  let layers = []; // [{ key, text, spaced }] in play order
  let anon = 0;
  const resolved = slides.map((slide) => {
    const changes = [];
    const seen = new Set();
    for (const st of slide.statements) {
      let key = st.key ?? `$anon${anon++}`;
      // the same key twice on one slide (two samples() calls, say) keeps both
      if (seen.has(key)) key = `${key}#${anon++}`;
      seen.add(key);
      const at = layers.findIndex((l) => l.key === key);
      if (st.remove) {
        if (at !== -1) {
          layers = layers.filter((_, i) => i !== at);
          changes.push({ key, kind: 'remove' });
        }
        continue;
      }
      if (at === -1) {
        // a new layer starts its own paragraph unless it sat right under another on its slide
        layers = [...layers, { key, text: st.text, spaced: st.spaced || seen.size === 1 }];
        changes.push({ key, kind: 'add' });
      } else if (layers[at].text !== st.text) {
        layers = layers.map((l, i) => (i === at ? { ...l, text: st.text } : l));
        changes.push({ key, kind: 'change' });
      }
    }
    const code = layers.map((l, i) => (i === 0 ? l.text : (l.spaced ? '\n\n' : '\n') + l.text)).join('');
    return { ...slide, code, changes };
  });
  return { slides: resolved, error: null };
}

// Index of the slide containing a source offset (for "play the slide my cursor is in")
export function slideIndexAt(slides, pos) {
  const i = slides.findIndex((s) => pos >= s.start && pos <= s.end);
  return i === -1 ? Math.max(0, slides.length - 1) : i;
}

/*
Line diff from one slide's code to the next, for highlighting.
Returns { added: [line numbers, 1-based, in `next`], changed: [...],
removed: [{ before: line number in `next` (or lines+1 for the end), lines: [text] }] }.
A removal directly followed by additions counts those additions as changed.
*/
export function diffLines(prev, next) {
  const a = prev ? prev.split('\n') : [];
  const b = next ? next.split('\n') : [];
  const n = a.length;
  const m = b.length;
  // LCS table; decks are small, so O(n*m) is fine
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const added = [];
  const changed = [];
  const removed = [];
  let i = 0;
  let j = 0;
  let pendingRemoved = [];
  const flushRemoved = () => {
    if (!pendingRemoved.length) return false;
    removed.push({ before: j + 1, lines: pendingRemoved });
    pendingRemoved = [];
    return true;
  };
  let replacing = false;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flushRemoved();
      replacing = false;
      i++;
      j++;
    } else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      // take removals first, so a replaced line reads as a change
      pendingRemoved.push(a[i]);
      i++;
    } else {
      if (flushRemoved()) replacing = true;
      (replacing ? changed : added).push(j + 1);
      j++;
    }
  }
  flushRemoved();
  return { added, changed, removed };
}

/*
The code to play for an editor holding `text` with the cursor at `cursor`: for a
deck, the full code of the slide the cursor is in; anything else plays as is
(including a deck with a syntax error, so the usual error message shows).
*/
export function playableCode(text, cursor = 0) {
  if (!isDeck(text)) return text;
  const { slides, error } = parseDeck(text);
  if (error || !slides.length) return text;
  return slides[slideIndexAt(slides, cursor)].code;
}

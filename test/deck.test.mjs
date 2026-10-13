import { describe, expect, it } from 'vitest';
import { diffLines, isDeck, parseDeck, playableCode, slideIndexAt, splitDeck } from '../packages/transpiler/deck.mjs';

// A three-slide toy deck: kick, then hats, then bass replaces nothing and the hat changes
const TOY = `// # Four on the floor
// A kick on every beat.
setcpm(124/4)
kick: s("bd*4")

// ---
// ## Add hats
hat: s("~ hh").fast(2)

// ---
// ## Bass, and open the hats
bass: note("c2 ~ c2 ~").s("sawtooth")
hat: s("~ oh").fast(2)
`;

describe('isDeck', () => {
  it('needs a marker on its own line', () => {
    expect(isDeck(TOY)).toBe(true);
    expect(isDeck('s("bd") // --- not a marker')).toBe(false);
    expect(isDeck('s("bd")')).toBe(false);
  });
});

describe('splitDeck', () => {
  it('splits slides at markers and reads leading comments as prose', () => {
    const { slides, error } = splitDeck(TOY);
    expect(error).toBeNull();
    expect(slides).toHaveLength(3);
    expect(slides[0].title).toBe('Four on the floor');
    expect(slides[0].prose).toBe('# Four on the floor\nA kick on every beat.');
    expect(slides[1].patch).toBe('hat: s("~ hh").fast(2)');
    expect(slides[2].statements.map((s) => s.key)).toEqual(['bass', 'hat']);
  });

  it('ignores --- inside strings and template literals', () => {
    // Edge case: the marker text inside code must not split the slide
    const { slides } = splitDeck('const a = `\n// ---\n`\nkick: s("bd")');
    expect(slides).toHaveLength(1);
  });

  it('keeps comments next to code with that code, not in the prose', () => {
    const { slides } = splitDeck('// Intro\nkick: s("bd*4") // steady\n// the hats\nhat: s("hh*8")');
    expect(slides[0].prose).toBe('Intro');
    expect(slides[0].statements[0].text).toBe('kick: s("bd*4") // steady');
    expect(slides[0].statements[1].text).toBe('// the hats\nhat: s("hh*8")');
  });

  it('leaves Strudel metadata comments out of the prose', () => {
    const { slides } = splitDeck('// @title Genres\n// # House\nkick: s("bd*4")');
    expect(slides[0].prose).toBe('# House');
  });

  it('reports a parse error instead of throwing', () => {
    // Regression guard: half-typed code in the editor must not crash the UI
    const { slides, error } = splitDeck('kick: s("bd"');
    expect(slides).toEqual([]);
    expect(error).toBeTruthy();
  });

  it('names the slide a syntax error is on', () => {
    const { error } = splitDeck('kick: s("bd")\n// ---\nhat: s("hh"');
    expect(error.slide).toBe(1);
  });

  it('only counts a marker alone on its line', () => {
    // a trailing `// ---` after code is just a comment
    const { slides } = splitDeck('kick: s("bd") // ---\nhat: s("hh")');
    expect(slides).toHaveLength(1);
  });

  it('handles two statements on one line', () => {
    const { slides } = splitDeck('kick: s("bd"); hat: s("hh")');
    expect(slides[0].statements.map((s) => s.text)).toEqual(['kick: s("bd");', 'hat: s("hh")']);
  });
});

describe('parseDeck: patches by name', () => {
  it('resolves each slide to the full code it plays', () => {
    const { slides } = parseDeck(TOY);
    expect(slides[0].code).toBe('setcpm(124/4)\nkick: s("bd*4")');
    expect(slides[1].code).toBe('setcpm(124/4)\nkick: s("bd*4")\n\nhat: s("~ hh").fast(2)');
    // the hat is replaced in place; the bass is new and goes at the end
    expect(slides[2].code).toBe(
      'setcpm(124/4)\nkick: s("bd*4")\n\nhat: s("~ oh").fast(2)\n\nbass: note("c2 ~ c2 ~").s("sawtooth")',
    );
    expect(slides[2].changes).toEqual([
      { key: 'bass', kind: 'add' },
      { key: 'hat', kind: 'change' },
    ]);
  });

  it('removes a layer with `name: silence`', () => {
    const { slides } = parseDeck('kick: s("bd*4")\nhat: s("hh*8")\n// ---\nkick: silence');
    expect(slides[1].code).toBe('hat: s("hh*8")');
    expect(slides[1].changes).toEqual([{ key: 'kick', kind: 'remove' }]);
  });

  it('`_name:` mutes the named layer in place', () => {
    const { slides } = parseDeck('kick: s("bd*4")\nhat: s("hh*8")\n// ---\n_kick: s("bd*4")');
    expect(slides[1].code).toBe('_kick: s("bd*4")\nhat: s("hh*8")');
  });

  it('keys calls by function name, so a later setcpm replaces the first', () => {
    const { slides } = parseDeck('setcpm(120/4)\nkick: s("bd*4")\n// ---\nsetcpm(128/4)');
    expect(slides[1].code).toBe('setcpm(128/4)\nkick: s("bd*4")');
  });

  it('keys variables by name', () => {
    const { slides } = parseDeck('const chords = "<Am C>"\n$: chord(chords)\n// ---\nconst chords = "<Dm F>"');
    expect(slides[1].code).toBe('const chords = "<Dm F>"\n$: chord(chords)');
  });

  it('keys Hydra chains by their output', () => {
    const deck = 'await initHydra()\nosc(4).out()\nshape(3).out(o1)\n// ---\nnoise(2).out(o0)\nawait initHydra()';
    const { slides } = parseDeck(deck);
    // o0 is replaced, o1 kept, and the repeated initHydra() is not duplicated
    expect(slides[1].code).toBe('await initHydra()\nnoise(2).out(o0)\nshape(3).out(o1)');
  });

  it('always appends anonymous $: layers', () => {
    const { slides } = parseDeck('$: s("bd*4")\n// ---\n$: s("hh*8")');
    expect(slides[1].code).toBe('$: s("bd*4")\n\n$: s("hh*8")');
  });

  it('keeps both when a slide repeats a key, like two samples() calls', () => {
    const { slides } = parseDeck('samples("a")\nsamples("b")\nkick: s("bd")');
    expect(slides[0].code).toBe('samples("a")\nsamples("b")\nkick: s("bd")');
  });

  it('editing an early slide flows into later slides', () => {
    // The point of patches: change the kick once, every later slide follows
    const edited = TOY.replace('kick: s("bd*4")', 'kick: s("bd*4").bank("RolandTR909")');
    const { slides } = parseDeck(edited);
    expect(slides[2].code).toContain('kick: s("bd*4").bank("RolandTR909")');
  });

  it('a plain file is a one-slide deck that plays as written', () => {
    const { slides } = parseDeck('$: s("bd*4")\n$: s("hh*8")');
    expect(slides).toHaveLength(1);
    expect(slides[0].code).toBe('$: s("bd*4")\n$: s("hh*8")');
  });
});

describe('slideIndexAt', () => {
  it('finds the slide holding a cursor offset', () => {
    const { slides } = parseDeck(TOY);
    expect(slideIndexAt(slides, 0)).toBe(0);
    expect(slideIndexAt(slides, TOY.indexOf('hat: s("~ hh")'))).toBe(1);
    expect(slideIndexAt(slides, TOY.length)).toBe(2);
  });
});

describe('diffLines', () => {
  it('marks new lines as added', () => {
    expect(diffLines('a\nb', 'a\nb\nc')).toEqual({ added: [3], changed: [], removed: [] });
  });

  it('marks a replaced line as changed and keeps the old text', () => {
    expect(diffLines('a\nb\nc', 'a\nB\nc')).toEqual({
      added: [],
      changed: [2],
      removed: [{ before: 2, lines: ['b'] }],
    });
  });

  it('reports removals at the end', () => {
    expect(diffLines('a\nb', 'a')).toEqual({ added: [], changed: [], removed: [{ before: 2, lines: ['b'] }] });
  });

  it('treats the first slide as all new', () => {
    expect(diffLines('', 'a\nb')).toEqual({ added: [1, 2], changed: [], removed: [] });
  });
});

describe('playableCode', () => {
  it('plays the slide the cursor is in', () => {
    // Ctrl+Enter on a deck in code view: slide 2's full code, not the raw file
    expect(playableCode(TOY, TOY.indexOf('hat: s("~ hh")'))).toBe(
      'setcpm(124/4)\nkick: s("bd*4")\n\nhat: s("~ hh").fast(2)',
    );
  });

  it('passes plain code and broken decks through unchanged', () => {
    expect(playableCode('$: s("bd")', 0)).toBe('$: s("bd")');
    const broken = 'kick: s("bd"\n// ---\nhat: s("hh")';
    expect(playableCode(broken, 0)).toBe(broken);
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildComposePrompt,
  buildInlineSuggestionsPrompt,
  normalizeContextFiles,
  stripCodeFences,
} from '../website/src/repl/ai_prompt.mjs';

describe('ai compose prompt', () => {
  it('normalizes and filters context files', () => {
    // arrange
    const input = [
      { name: 'one.strudel', content: 'a' },
      { name: ' ', content: '   ' },
      { name: null, content: 'b' },
    ];

    // act
    const files = normalizeContextFiles(input);

    // assert
    expect(files).toEqual([
      { name: 'one.strudel', content: 'a' },
      { name: 'untitled', content: 'b' },
    ]);
  });

  it('builds prompt with context blocks', () => {
    // arrange
    const input = {
      prompt: 'make a slow ambient piece',
      contextFiles: [{ name: 'past.strudel', content: 'slow sine' }],
    };

    // act
    const prompt = buildComposePrompt(input);

    // assert
    expect(prompt).toContain('User request:');
    expect(prompt).toContain('make a slow ambient piece');
    expect(prompt).toContain('Context compositions:');
    expect(prompt).toContain('[1] past.strudel');
    expect(prompt).toContain('slow sine');
  });

  it('includes sound context when provided', () => {
    // arrange
    const soundContext = { synths: ['saw'], drumMachines: ['kit_bd'] };

    // act
    const prompt = buildComposePrompt({
      prompt: 'make a slow ambient piece',
      contextFiles: [],
      soundContext,
    });

    // assert
    expect(prompt).toContain('Available instruments');
    expect(prompt).toContain('Synths: saw');
    expect(prompt).toContain('Drum machines: kit_bd');
  });

  it('includes hydra usage context', () => {
    // arrange
    const input = {
      prompt: 'add visuals',
      contextFiles: [],
    };

    // act
    const prompt = buildComposePrompt(input);

    // assert
    expect(prompt).toContain('Hydra usage');
    expect(prompt).toContain('await initHydra()');
    expect(prompt).toContain('.out()');
    expect(prompt).toContain('H(pattern)');
  });

  it('includes tempo guidance when cps is provided', () => {
    // arrange
    const input = {
      prompt: 'add drums',
      contextFiles: [],
      tempoCps: 1.5,
    };

    // act
    const prompt = buildComposePrompt(input);

    // assert
    expect(prompt).toContain('Tempo:');
    expect(prompt).toContain('cpm');
    expect(prompt).toContain('cps');
    expect(prompt).toContain('setcpm');
  });

  it('includes structure preferences for full compositions', () => {
    // arrange
    const input = {
      prompt: 'build a full piece',
      contextFiles: [],
    };

    // act
    const prompt = buildComposePrompt(input);

    // assert
    expect(prompt).toContain('Composition structure');
    expect(prompt).toContain('fullStack');
    expect(prompt).toContain('$: fullStack');
  });

  it('adds gain guidance when generation settings are enabled', () => {
    // arrange
    const input = {
      prompt: 'fade in slowly',
      contextFiles: [],
      startGainsAtZero: true,
      useGainSliders: true,
    };

    // act
    const prompt = buildComposePrompt(input);

    // assert
    expect(prompt).toContain('Gain guidance:');
    expect(prompt).toContain('Start all gain values at 0');
    expect(prompt).toContain('slider(value, min, max, step)');
  });

  it('builds a suggestions prompt with code and JSON shape', () => {
    // arrange
    const input = {
      code: 's("bd")',
      selection: '',
    };

    // act
    const prompt = buildInlineSuggestionsPrompt(input);

    // assert
    expect(prompt).toContain('{"suggestions"');
    expect(prompt).toContain('"why"');
    expect(prompt).toContain('Current composition:');
    expect(prompt).toContain('s("bd")');
    expect(prompt).toContain('fullStack');
  });

  it('strips code fences from model output', () => {
    // arrange
    const fenced = '```js\ns("bd")\n```';
    // act
    const output = stripCodeFences(fenced);
    // assert
    expect(output).toBe('s("bd")');
    expect(stripCodeFences('s("bd")')).toBe('s("bd")');
  });
});

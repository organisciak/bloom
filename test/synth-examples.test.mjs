import { describe, it, expect } from 'vitest';
import { getSynthExamples } from '../website/src/repl/synth_examples.mjs';

describe('synth examples', () => {
  it('injects the synth name into example code', () => {
    // arrange: a synth name with quotes that needs escaping
    const synthName = 'bright"synth';

    // act: build examples for that synth
    const examples = getSynthExamples(synthName);

    // assert: each example references the escaped synth name
    expect(examples.length).toBeGreaterThan(0);
    examples.forEach((example) => {
      expect(example.code).toContain('bright\\"synth');
    });
  });

  it('uses drum machine names when available', () => {
    // arrange: drum hits that should map to bd/sd/hh
    const soundContext = {
      drumMachines: ['kit_bd', 'kit_sd', 'kit_hh'],
    };

    // act: build examples with drum context
    const examples = getSynthExamples('sawtooth', { soundContext });

    // assert: drum parts reference the drum machine names
    expect(examples[0].code).toContain('kit_bd');
    expect(examples[0].code).toContain('kit_sd');
    expect(examples[0].code).toContain('kit_hh');
  });
});

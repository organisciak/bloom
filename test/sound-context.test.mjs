import { describe, it, expect } from 'vitest';
import { buildSoundContextFromMap, formatSoundContext, pickSoundMatch } from '../website/src/repl/sound_context.mjs';

describe('sound context', () => {
  it('builds context from sound map entries', () => {
    // arrange
    const sounds = {
      synth1: { data: { type: 'synth' } },
      drum1: { data: { type: 'sample', tag: 'drum-machines' } },
      sample1: { data: { type: 'sample', tag: 'other' } },
      _hidden: { data: { type: 'synth' } },
    };

    // act
    const context = buildSoundContextFromMap(sounds);

    // assert
    expect(context).toEqual({ synths: ['synth1'], drumMachines: ['drum1'] });
  });

  it('formats context into a prompt-friendly block', () => {
    // arrange
    const context = { synths: ['saw'], drumMachines: ['kit_bd'] };

    // act
    const text = formatSoundContext(context);

    // assert
    expect(text).toContain('Synths: saw');
    expect(text).toContain('Drum machines: kit_bd');
  });

  it('matches drum hits by suffix', () => {
    // arrange
    const names = ['kit_bd', 'kit_sd'];

    // act
    const match = pickSoundMatch(names, 'bd');

    // assert
    expect(match).toBe('kit_bd');
  });
});

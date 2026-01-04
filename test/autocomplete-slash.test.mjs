import { describe, it, expect } from 'vitest';
import { __test__ as autocompleteTest } from '../packages/codemirror/autocomplete.mjs';

const { buildSlashCommandOptions, buildSlashDocOptions } = autocompleteTest;

describe('slash completions', () => {
  it('builds slash command options from slash triggers only', () => {
    // arrange
    const commands = [
      { trigger: '/ai', description: 'edit code' },
      { trigger: '\\ai', description: 'legacy' },
    ];

    // act
    const options = buildSlashCommandOptions(commands);

    // assert
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe('/ai');
    expect(options[0].apply).toBe('/ai');
    expect(options[0].info).toBe('edit code');
  });

  it('adds slash-prefixed filter text for docs', () => {
    // arrange
    const completions = [{ label: 'stack', detail: 'Strudel' }];
    const section = { name: 'Docs', rank: 0 };

    // act
    const options = buildSlashDocOptions(completions, section);

    // assert
    expect(options[0].label).toBe('stack');
    expect(options[0].apply).toBe('stack');
    expect(options[0].filterText).toBe('/stack');
    expect(options[0].section).toBe(section);
  });
});

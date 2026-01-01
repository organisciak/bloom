import { describe, it, expect } from 'vitest';
import { strudelAutocomplete } from '../packages/codemirror/autocomplete.mjs';

const createContext = (doc, explicit = true) => {
  const pos = doc.length;
  return {
    explicit,
    matchBefore: (regex) => {
      const source = regex.source.endsWith('$') ? regex.source : `${regex.source}$`;
      const anchored = new RegExp(source, regex.flags);
      const slice = doc.slice(0, pos);
      const match = slice.match(anchored);
      if (!match) return null;
      const text = match[0];
      return {
        from: pos - text.length,
        to: pos,
        text,
      };
    },
  };
};

describe('autocomplete', () => {
  it('includes Hydra docs in completions', () => {
    const context = createContext('ka', true);
    const result = strudelAutocomplete(context);
    expect(result).not.toBeNull();
    const labels = result.options.map((option) => option.label);
    expect(labels).toContain('kaleid');
    const hydraOption = result.options.find((option) => option.label === 'kaleid');
    expect(hydraOption?.detail).toBe('Hydra');
    const hasStrudel = result.options.some((option) => option.detail === 'Strudel');
    expect(hasStrudel).toBe(true);
  });
});

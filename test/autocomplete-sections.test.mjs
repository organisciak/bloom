import { describe, it, expect } from 'vitest';
import { __test__ } from '../packages/codemirror/autocomplete.mjs';

describe('autocomplete sections', () => {
  it('groups popular options ahead of all', () => {
    const options = __test__.buildSectionedOptions({
      labels: ['alpha', 'beta', 'gamma'],
      popularLabels: ['beta'],
      type: 'sound',
    });
    expect(options[0].label).toBe('beta');
    expect(options[0].section?.name).toBe('Popular');
    expect(options[1].section?.name).toBe('All');
  });

  it('picks popular banks from hints', () => {
    const banks = ['tr909', 'linn', 'weirdbank'];
    const popular = __test__.getPopularBanks(banks);
    expect(popular).toContain('tr909');
  });
});

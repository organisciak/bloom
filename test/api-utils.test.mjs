import { describe, it, expect } from 'vitest';
import { buildApiUrl } from '../website/src/repl/api_utils.mjs';

describe('buildApiUrl', () => {
  it('uses root base', () => {
    // arrange
    const baseUrl = '/';
    const path = '/api/compose';

    // act
    const result = buildApiUrl(baseUrl, path);

    // assert
    expect(result).toBe('/api/compose');
  });

  it('prefixes a subpath base', () => {
    // arrange
    const baseUrl = '/strudel/';
    const path = '/api/compose';

    // act
    const result = buildApiUrl(baseUrl, path);

    // assert
    expect(result).toBe('/strudel/api/compose');
  });

  it('normalizes missing slashes', () => {
    // arrange
    const baseUrl = '/strudel';
    const path = 'api/compose';

    // act
    const result = buildApiUrl(baseUrl, path);

    // assert
    expect(result).toBe('/strudel/api/compose');
  });
});

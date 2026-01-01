import { describe, it, expect } from 'vitest';
import { code2hash } from '@strudel/core';
import { buildPostcard } from '../website/src/repl/postcard_utils.mjs';

describe('postcard utils', () => {
  it('builds a postcard with metadata and share link', () => {
    const code = `// "Dream"\n// @by Ada\n$: s("bd")`;
    const output = buildPostcard({
      code,
      cps: 1,
      origin: 'https://example.com',
      pathname: '/repl',
    });
    expect(output).toContain('"Dream"');
    expect(output).toContain('@by Ada');
    expect(output).toContain('@tempo 60 cpm');
    expect(output).toContain(`@share https://example.com/repl#${code2hash(code)}`);
    expect(output).toContain('s("bd")');
  });
});

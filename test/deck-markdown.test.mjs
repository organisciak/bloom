import { describe, expect, it } from 'vitest';
import { renderInline, renderMarkdown } from '../website/src/repl/deck_markdown.mjs';

describe('renderInline', () => {
  it('formats bold, italic, code and links', () => {
    expect(renderInline('**kick** on *every* beat, `s("bd*4")`, [more](https://strudel.cc)')).toBe(
      '<strong>kick</strong> on <em>every</em> beat, <code>s(&quot;bd*4&quot;)</code>, ' +
        '<a href="https://strudel.cc" target="_blank" rel="noopener noreferrer">more</a>',
    );
  });

  it('leaves mini-notation stars inside code alone', () => {
    // `bd*4 hh*2` must not turn into italics
    expect(renderInline('`bd*4 hh*2`')).toBe('<code>bd*4 hh*2</code>');
  });

  it('escapes HTML so a deck cannot inject markup', () => {
    expect(renderInline('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('drops javascript: links but keeps the label', () => {
    expect(renderInline('[click](javascript:void)')).toBe('click');
  });
});

describe('renderMarkdown', () => {
  it('renders headings, paragraphs and lists', () => {
    const html = renderMarkdown('# House\nFour on the floor,\naround 124 BPM.\n\n- kick\n- open hat\n\n1. one\n2. two');
    expect(html).toBe(
      '<h1>House</h1>\n<p>Four on the floor, around 124 BPM.</p>\n<ul><li>kick</li><li>open hat</li></ul>\n<ol><li>one</li><li>two</li></ol>',
    );
  });

  it('renders block quotes', () => {
    expect(renderMarkdown('> Listen for the hat')).toBe('<blockquote>Listen for the hat</blockquote>');
  });

  it('returns nothing for empty text', () => {
    expect(renderMarkdown('')).toBe('');
  });
});

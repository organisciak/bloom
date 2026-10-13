/*
deck_markdown.mjs - the small Markdown used in deck slide text.

Headings, paragraphs, bullet and numbered lists, block quotes, **bold**,
*italic*, `code` and [links](https://…). Everything is HTML-escaped first, so
a deck file cannot inject markup; links only allow http(s) and relative URLs.
*/

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const safeHref = (url) => (/^(https?:\/\/|\/|#|\.\.?\/)/i.test(url) ? url : null);

export function renderInline(text) {
  const codes = [];
  // pull out `code` first so its contents are not formatted
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\uE000${codes.length - 1}\uE000`;
  });
  out = out
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
      const href = safeHref(url);
      return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?=[^*\w]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?=[^_\w]|$)/g, '$1<em>$2</em>');
  return out.replace(/\uE000(\d+)\uE000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

export function renderMarkdown(text = '') {
  const blocks = [];
  let list = null; // { tag, items }
  let paragraph = [];
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list)
      blocks.push(`<${list.tag}>${list.items.map((i) => `<li>${renderInline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) blocks.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const quoted = line.match(/^>\s?(.*)$/);
    if (!line.trim()) {
      flushAll();
    } else if (heading) {
      flushAll();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const tag = bullet ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      list = list ?? { tag, items: [] };
      list.items.push((bullet ?? numbered)[1]);
    } else if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
    } else if (list && /^\s+/.test(raw)) {
      // indented continuation of a list item
      list.items[list.items.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      flushQuote();
      paragraph.push(line.trim());
    }
  }
  flushAll();
  return blocks.join('\n');
}

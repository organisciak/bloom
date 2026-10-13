/*
deck_url.mjs - `?deck=name&slide=N` in the address bar, so a reload keeps your
place and a link can point at one slide. Slides are 1-based in the URL.
*/

// Deck name and 0-based slide index from a query string, or null
export function deckFromSearch(search) {
  const params = new URLSearchParams(search);
  const name = params.get('deck');
  if (!name || !/^[\w-]+$/.test(name)) return null;
  const slide = parseInt(params.get('slide'), 10);
  return { name, index: Number.isFinite(slide) && slide > 0 ? slide - 1 : 0 };
}

// href with ?slide= set to a 0-based index, but only for decks opened by URL
export function withSlide(href, index) {
  const url = new URL(href);
  if (!url.searchParams.has('deck')) return href;
  url.searchParams.set('slide', String(index + 1));
  return url.toString();
}

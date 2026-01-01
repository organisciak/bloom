export const toggleSnippet = ({ code, marker, snippet }) => {
  const raw = code ?? '';
  if (!marker || !snippet) return raw;
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) {
    const prefix = raw.trim().length ? '\n\n' : '';
    return `${raw}${prefix}${snippet}`;
  }
  const before = raw.slice(0, markerIndex).trimEnd();
  const after = raw.slice(markerIndex);
  const parts = after.split(/\n{2,}/);
  parts.shift();
  const rest = parts.join('\n\n').trimStart();
  if (!before) return rest;
  if (!rest) return before;
  return `${before}\n\n${rest}`;
};

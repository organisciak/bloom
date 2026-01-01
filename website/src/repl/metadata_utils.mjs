export const buildMetadataBlock = ({ title, by, tempoCpm } = {}) => {
  const safeTitle = (title || 'Untitled').replace(/"/g, "'");
  const lines = [`// "${safeTitle}"`];
  lines.push(`// @by ${by || 'you'}`);
  if (Number.isFinite(tempoCpm)) {
    lines.push(`// @tempo ${Math.round(tempoCpm)} cpm`);
  }
  return lines.join('\n');
};

export const hasMetadata = (meta = {}) => {
  return Boolean(meta.title || meta.by || meta.tempo || meta.genre || meta.url);
};

export const prependMetadataBlock = (code, block) => {
  const raw = code ?? '';
  if (!block) return raw;
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('// "')) {
    return raw;
  }
  return `${block}\n\n${trimmed}`;
};

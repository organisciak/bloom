export const pickRandomPattern = ({ favorites, patterns, avoidIds }) => {
  let candidates = favorites.length ? favorites : patterns;
  if (!candidates.length) {
    return null;
  }
  const avoid = new Set((avoidIds || []).filter(Boolean));
  if (candidates.length > 1 && avoid.size) {
    const filtered = candidates.filter((pattern) => !avoid.has(pattern.id));
    if (filtered.length) {
      candidates = filtered;
    }
  }
  const index = Math.floor(Math.random() * candidates.length);
  return candidates[index];
};

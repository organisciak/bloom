const normalizeList = (value) => (Array.isArray(value) ? value : []);

const cleanList = (values) =>
  Array.from(
    new Set(
      normalizeList(values)
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const normalizeSoundContext = (context) => {
  return {
    synths: cleanList(context?.synths),
    drumMachines: cleanList(context?.drumMachines),
  };
};

export const buildSoundContextFromMap = (sounds) => {
  if (!sounds || typeof sounds !== 'object') {
    return normalizeSoundContext();
  }
  const synths = [];
  const drumMachines = [];
  for (const [name, entry] of Object.entries(sounds)) {
    if (!name || name.startsWith('_')) continue;
    const type = entry?.data?.type;
    const tag = entry?.data?.tag;
    if (type === 'synth' || type === 'soundfont') {
      synths.push(name);
      continue;
    }
    if (type === 'sample' && tag === 'drum-machines') {
      drumMachines.push(name);
    }
  }
  return normalizeSoundContext({ synths, drumMachines });
};

export const formatSoundContext = (context) => {
  const normalized = normalizeSoundContext(context);
  const lines = [];
  if (normalized.synths.length) {
    lines.push(`Synths: ${normalized.synths.join(', ')}`);
  }
  if (normalized.drumMachines.length) {
    lines.push(`Drum machines: ${normalized.drumMachines.join(', ')}`);
  }
  return lines.join('\n');
};

export const pickSoundMatch = (soundNames, hint) => {
  const names = normalizeList(soundNames);
  const exact = names.find((name) => name.toLowerCase() === hint);
  if (exact) return exact;
  const suffix = `_${hint}`;
  const match = names.find((name) => name.toLowerCase().endsWith(suffix));
  if (match) return match;
  return null;
};

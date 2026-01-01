export const consoleCharms = [
  {
    id: 'gremlin',
    label: 'Summon gremlin',
    emoji: '🧌',
    lines: [
      'Gremlin approves this groove.',
      'The gremlin insists on more hats.',
      'Gremlin says: tiny changes, big magic.',
    ],
    spell: 's("bd hh sd hh").fast(2).gain(0.8)',
  },
  {
    id: 'oracle',
    label: 'Ask oracle',
    emoji: '🔮',
    lines: ['The oracle whispers: leave space.', 'The oracle nods: repeat the simple thing.'],
    spell: 'note("c a f e").slow(2).gain(0.6)',
  },
  {
    id: 'pixie',
    label: 'Call pixie',
    emoji: '🧚',
    lines: ['Pixie sprinkles glitter on the highs.', 'Pixie says: try a tiny pan wobble.'],
    spell: 's("hh*8").pan("0 0.2 0.8 0.4").gain(0.5)',
  },
  {
    id: 'meteor',
    label: 'Summon meteor',
    emoji: '☄️',
    lines: ['Meteor arriving on the off‑beat.', 'Meteor says: drop a surprise kick.'],
    spell: 's("bd ~ ~ [bd] ").fast(2).gain(0.9)',
  },
  {
    id: 'moth',
    label: 'Invite moth',
    emoji: '🦋',
    lines: ['Moth circles the slowest light.', 'Moth says: soften the edges.'],
    spell: 'note("c3 ~ g2").s("sine").lpf(600).slow(4).gain(0.5)',
  },
];

export const pickCharm = (charms, lastId) => {
  const list = Array.isArray(charms) ? charms : [];
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const filtered = lastId ? list.filter((charm) => charm.id !== lastId) : list;
  const pool = filtered.length ? filtered : list;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  const line = choice.lines[Math.floor(Math.random() * choice.lines.length)];
  return { ...choice, line };
};

import { normalizeSoundContext, pickSoundMatch } from './sound_context.mjs';

const escapeSoundName = (name) => {
  if (!name) return '';
  return String(name).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

const buildDrumHits = (soundContext) => {
  const { drumMachines } = normalizeSoundContext(soundContext);
  const pick = (hint, fallback) => pickSoundMatch(drumMachines, hint) ?? fallback;
  return {
    bd: pick('bd', 'bd'),
    sd: pick('sd', 'sd'),
    hh: pick('hh', 'hh'),
  };
};

const exampleTemplates = [
  {
    id: 'warm-bed',
    title: 'warm bed',
    description: 'A gentle pad with a soft drum spine.',
    build: (synth, drums) => `stack(
  s("${drums.bd} ~ [${drums.sd}] ~").gain(0.6),
  s("${drums.hh}*8").gain(0.2),
  note("<c3 a2 f3 g2>").s("${synth}").slow(2).room(0.5).gain(0.4)
)`,
  },
  {
    id: 'glassy-arp',
    title: 'glassy arp',
    description: 'Bright arpeggio motion with a steady kick.',
    build: (synth, drums) => `stack(
  s("${drums.bd}*2").gain(0.5),
  note("<c4 e4 g4 b4>").s("${synth}").fast(2).gain(0.3).pan("<0.2 0.8>")
)`,
  },
  {
    id: 'evening-melody',
    title: 'evening melody',
    description: 'A simple lead that leaves space.',
    build: (synth) =>
      `note("c4 ~ e4 g4").s("${synth}").slow(2).lpf(1200).gain(0.35).room(0.2)`,
  },
];

export const getSynthExamples = (synthName, { limit, soundContext } = {}) => {
  const safeSynth = escapeSoundName(synthName);
  const drums = buildDrumHits(soundContext);
  const safeDrums = {
    bd: escapeSoundName(drums.bd),
    sd: escapeSoundName(drums.sd),
    hh: escapeSoundName(drums.hh),
  };
  const list = exampleTemplates.map((example) => ({
    id: example.id,
    title: example.title,
    description: example.description,
    code: example.build(safeSynth, safeDrums),
  }));
  return typeof limit === 'number' ? list.slice(0, limit) : list;
};

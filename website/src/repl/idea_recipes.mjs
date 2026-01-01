export const ideaRecipes = [
  {
    id: 'clockwork',
    title: 'Clockwork hats',
    code: 's("bd [hh*2 hh] sd hh").gain("1 0.8 0.9 0.7").fast(2)',
  },
  {
    id: 'low-glow',
    title: 'Low glow',
    code: 'note("c2 ~ [g1 c2]").s("sawtooth").lpf(400).gain(0.6).slow(2)',
  },
  {
    id: 'skipping-stones',
    title: 'Skipping stones',
    code: 's("bd ~ [hh hh] ~ sd").jux(rev).gain("1 0.7 0.9 0.6")',
  },
  {
    id: 'sparkline',
    title: 'Sparkline',
    code: 'note("<c4 e4 g4 b4>").s("triangle").slow(2).gain(0.5).pan("0 0.2 0.8 0.4")',
  },
  {
    id: 'pulse-lab',
    title: 'Pulse lab',
    code: 's("bd*2 [~ hh] sd").fast(2).gain("1 0.6 0.9 0.7")',
  },
  {
    id: 'half-light',
    title: 'Half light',
    code: 'note("c3 ~ g2").s("sine").lpf(600).room(0.3).gain(0.5).slow(4)',
  },
  {
    id: 'rim-garden',
    title: 'Rim garden',
    code: 's("rim*4 [~ rim] rim ~").gain("0.6 0.4 0.6 0.4").fast(2)',
  },
  {
    id: 'glass-bells',
    title: 'Glass bells',
    code: 'note("<c5 e5 g5 b5>").s("square").hpf(700).gain(0.4).slow(3)',
  },
  {
    id: 'drive-loop',
    title: 'Drive loop',
    code: 's("bd [bd hh] sd hh").distort(0.3).gain(0.9).fast(2)',
  },
  {
    id: 'ghost-steps',
    title: 'Ghost steps',
    code: 's("bd ~ sd ~").mask("<1 [0 1 0 1]>").gain(0.8).slow(2)',
  },
];

export const pickIdeaRecipe = (recipes, lastId) => {
  const list = Array.isArray(recipes) ? recipes : [];
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const filtered = lastId ? list.filter((recipe) => recipe.id !== lastId) : list;
  const pool = filtered.length ? filtered : list;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
};

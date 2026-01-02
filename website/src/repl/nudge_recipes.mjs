export const nudgeRecipes = [
  {
    id: 'sparkle-hats',
    title: 'sparkle hats',
    code: '$: s("hh*8").gain(0.35).pan("0.1 0.9").room(0.2)',
  },
  {
    id: 'ghost-kick',
    title: 'ghost kick',
    code: '$: s("~ bd").fast(2).gain(0.5).shape(0.2)',
  },
  {
    id: 'soft-glue',
    title: 'soft glue',
    code: '$: s("sd ~ sd ~").gain(0.25).room(0.4).lpf(1800)',
  },
  {
    id: 'high-wash',
    title: 'high wash',
    code: '$: s("noise*4").hpf(800).room(0.6).gain(0.2).slow(2)',
  },
  {
    id: 'fifth-shadow',
    title: 'fifth shadow',
    code: '$: note("<0 7>").s("sawtooth").lpf(600).gain(0.25).slow(4)',
  },
];

export const pickNudgeRecipe = (recipes, lastId) => {
  const list = Array.isArray(recipes) ? recipes : [];
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const filtered = lastId ? list.filter((recipe) => recipe.id !== lastId) : list;
  const pool = filtered.length ? filtered : list;
  return pool[Math.floor(Math.random() * pool.length)];
};

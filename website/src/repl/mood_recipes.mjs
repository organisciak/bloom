export const moodRecipes = [
  {
    id: 'glow',
    title: 'glow',
    code: '$: s("hh*8").room(0.6).gain(0.3).pan("0.2 0.8")',
  },
  {
    id: 'grit',
    title: 'grit',
    code: '$: s("bd sd").distort(0.35).gain(0.7).fast(2)',
  },
  {
    id: 'mist',
    title: 'mist',
    code: '$: note("<c4 e4 g4>").s("sine").lpf(600).room(0.7).gain(0.3).slow(4)',
  },
  {
    id: 'pulse',
    title: 'pulse',
    code: '$: s("bd ~ [bd bd]").gain(0.8).fast(2)',
  },
  {
    id: 'spark',
    title: 'spark',
    code: '$: s("rim*4").gain(0.4).hpf(1200).pan("0.1 0.9")',
  },
  {
    id: 'halo',
    title: 'halo',
    code: '$: note("<c5 g4 e4>").s("triangle").slow(2).room(0.5).gain(0.35)',
  },
];

export const pickMoodRecipe = (recipes, lastId) => {
  const list = Array.isArray(recipes) ? recipes : [];
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const filtered = lastId ? list.filter((recipe) => recipe.id !== lastId) : list;
  const pool = filtered.length ? filtered : list;
  return pool[Math.floor(Math.random() * pool.length)];
};

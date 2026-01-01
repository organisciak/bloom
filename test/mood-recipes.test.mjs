import { describe, it, expect } from 'vitest';
import { moodRecipes, pickMoodRecipe } from '../website/src/repl/mood_recipes.mjs';

describe('mood recipes', () => {
  it('returns a recipe and avoids repeats when possible', () => {
    const first = pickMoodRecipe(moodRecipes, null);
    expect(first).not.toBeNull();
    const second = pickMoodRecipe(moodRecipes, first.id);
    expect(second).not.toBeNull();
    if (moodRecipes.length > 1) {
      expect(second.id).not.toBe(first.id);
    }
  });
});

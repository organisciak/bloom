import { describe, it, expect } from 'vitest';
import { nudgeRecipes, pickNudgeRecipe } from '../website/src/repl/nudge_recipes.mjs';

describe('nudge recipes', () => {
  it('returns a recipe and avoids repeats when possible', () => {
    const first = pickNudgeRecipe(nudgeRecipes, null);
    expect(first).not.toBeNull();
    const second = pickNudgeRecipe(nudgeRecipes, first.id);
    expect(second).not.toBeNull();
    if (nudgeRecipes.length > 1) {
      expect(second.id).not.toBe(first.id);
    }
  });
});

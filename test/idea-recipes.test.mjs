import { describe, it, expect } from 'vitest';
import { ideaRecipes, pickIdeaRecipe } from '../website/src/repl/idea_recipes.mjs';

describe('idea recipes', () => {
  it('returns a recipe and avoids repeats when possible', () => {
    const first = pickIdeaRecipe(ideaRecipes, null);
    expect(first).not.toBeNull();
    const second = pickIdeaRecipe(ideaRecipes, first.id);
    expect(second).not.toBeNull();
    if (ideaRecipes.length > 1) {
      expect(second.id).not.toBe(first.id);
    }
  });
});

import type { Recipe } from "../data/recipes";
type RecipeStore = {
  list(seeds: Recipe[]): Promise<Recipe[]>;
  add(input: unknown, seeds: Recipe[]): Promise<Recipe>;
};
export function createRecipeStore(file: string): RecipeStore;
export const recipeStore: RecipeStore;

import type { Recipe } from "../data/recipes";
export const ingredientCategories: string[];
export function normalizeRecipeInput(value: unknown): Omit<Recipe, "id">;

"use client";

import { getDishImage } from "@/data/dish-photos";
import type { Recipe } from "@/data/recipes";

export function DishImage({ recipe, eager = false }: { recipe: Recipe; eager?: boolean }) {
  return <img src={getDishImage(recipe)} alt={recipe.name} width={512} height={512}
    loading={eager ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover"
    onError={(event) => {
      const fallback = "/dishes/categories/home-style.svg";
      if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
    }} />;
}

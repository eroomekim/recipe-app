"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import CollectionBar from "./CollectionBar";
import type { RecipeCardData } from "@/types";

interface RecipeCollectionProps {
  recipes: RecipeCardData[];
}

export default function RecipeCollection({ recipes }: RecipeCollectionProps) {
  const [filterRecipeIds, setFilterRecipeIds] = useState<string[] | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const displayRecipes = filterRecipeIds
    ? recipes.filter((r) => filterRecipeIds.includes(r.id))
    : recipes;

  return (
    <>
      <CollectionBar
        onFilter={(ids, label) => {
          setFilterRecipeIds(ids);
          setActiveFilter(label);
        }}
        activeFilter={activeFilter}
      />
      <RecipeGrid recipes={displayRecipes} />
    </>
  );
}

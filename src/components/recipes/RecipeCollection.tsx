// src/components/recipes/RecipeCollection.tsx — full replacement
"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import RecipeBooklet from "./RecipeBooklet";
import CollectionBar from "./CollectionBar";
import type { RecipeCardData } from "@/types";

interface RecipeCollectionProps {
  recipes: RecipeCardData[];
}

export default function RecipeCollection({ recipes }: RecipeCollectionProps) {
  const [bookletIndex, setBookletIndex] = useState<number | null>(null);
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
      <RecipeGrid
        recipes={displayRecipes}
        onCardClick={(index) => setBookletIndex(index)}
      />
      {bookletIndex !== null && (
        <RecipeBooklet
          recipeIds={displayRecipes.map((r) => r.id)}
          initialIndex={bookletIndex}
          onClose={() => setBookletIndex(null)}
        />
      )}
    </>
  );
}

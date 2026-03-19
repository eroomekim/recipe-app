"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import RecipeBooklet from "./RecipeBooklet";
import type { RecipeCardData } from "@/types";

interface RecipeCollectionProps {
  recipes: RecipeCardData[];
}

export default function RecipeCollection({ recipes }: RecipeCollectionProps) {
  const [bookletIndex, setBookletIndex] = useState<number | null>(null);

  return (
    <>
      <RecipeGrid
        recipes={recipes}
        onCardClick={(index) => setBookletIndex(index)}
      />
      {bookletIndex !== null && (
        <RecipeBooklet
          recipeIds={recipes.map((r) => r.id)}
          initialIndex={bookletIndex}
          onClose={() => setBookletIndex(null)}
        />
      )}
    </>
  );
}

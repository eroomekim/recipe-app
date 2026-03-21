"use client";

import { useState } from "react";
import RecipeGrid from "./RecipeGrid";
import CollectionBar from "./CollectionBar";
import FilterBar from "./FilterBar";
import type { RecipeCardData } from "@/types";

interface RecipeCollectionProps {
  recipes: RecipeCardData[];
}

export default function RecipeCollection({ recipes }: RecipeCollectionProps) {
  const [collectionFilterIds, setCollectionFilterIds] = useState<string[] | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [searchFiltered, setSearchFiltered] = useState<RecipeCardData[] | null>(null);

  // Apply collection filter first, then search/tag filters on top
  const collectionRecipes = collectionFilterIds
    ? recipes.filter((r) => collectionFilterIds.includes(r.id))
    : recipes;

  const displayRecipes = searchFiltered ?? collectionRecipes;

  return (
    <>
      <FilterBar
        recipes={collectionRecipes}
        onFilter={(filtered) => setSearchFiltered(filtered)}
      />
      <CollectionBar
        onFilter={(ids, label) => {
          setCollectionFilterIds(ids);
          setActiveCollection(label);
          setSearchFiltered(null); // reset search when collection changes
        }}
        activeFilter={activeCollection}
      />
      {displayRecipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif text-lg text-gray-500 italic">
            No recipes match your filters
          </p>
        </div>
      ) : (
        <RecipeGrid recipes={displayRecipes} />
      )}
    </>
  );
}

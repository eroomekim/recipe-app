"use client";

import { useState, useRef, useCallback } from "react";
import RecipeGrid from "./RecipeGrid";
import CollectionBar from "./CollectionBar";
import FilterBar from "./FilterBar";
import SeasonalShelf from "./SeasonalShelf";
import type { RecipeCardData } from "@/types";

interface RecipeCollectionProps {
  recipes: RecipeCardData[];
}

export default function RecipeCollection({ recipes }: RecipeCollectionProps) {
  const [collectionFilterIds, setCollectionFilterIds] = useState<string[] | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [searchFiltered, setSearchFiltered] = useState<RecipeCardData[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);

  const handleSearchFilter = useCallback((filtered: RecipeCardData[] | null) => setSearchFiltered(filtered), []);

  const handlePullStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handlePullEnd = useCallback(async (e: React.TouchEvent) => {
    if (pullStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - pullStartY.current;
    pullStartY.current = null;

    if (deltaY > 80) {
      setRefreshing(true);
      window.location.reload();
    }
  }, []);

  // Apply collection filter first, then search/tag filters on top
  const collectionRecipes = collectionFilterIds
    ? recipes.filter((r) => collectionFilterIds.includes(r.id))
    : recipes;

  const displayRecipes = searchFiltered ?? collectionRecipes;

  return (
    <div onTouchStart={handlePullStart} onTouchEnd={handlePullEnd}>
      {refreshing && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <SeasonalShelf />
      <FilterBar
        recipes={collectionRecipes}
        onFilter={handleSearchFilter}
      />
      <CollectionBar
        onFilter={(ids, label) => {
          setCollectionFilterIds(ids);
          setActiveCollection(label);
          setSearchFiltered(null); // reset search when collection changes
        }}
        activeFilter={activeCollection}
      />
      <div className="mb-4">
        <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600">
          {displayRecipes.length} {displayRecipes.length === 1 ? "Recipe" : "Recipes"}
        </span>
      </div>
      {displayRecipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif text-lg text-gray-600 italic">
            No recipes match your filters
          </p>
        </div>
      ) : (
        <RecipeGrid recipes={displayRecipes} />
      )}
    </div>
  );
}

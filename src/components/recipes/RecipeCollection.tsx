"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import RecipeGrid from "./RecipeGrid";
import CollectionBar from "./CollectionBar";
import FilterBar from "./FilterBar";
import SeasonalShelf from "./SeasonalShelf";
import type { RecipeCardData } from "@/types";

interface RecipeCollectionProps {
  recipes: RecipeCardData[];
}

export default function RecipeCollection({ recipes }: RecipeCollectionProps) {
  const searchParams = useSearchParams();
  const [collectionFilterIds, setCollectionFilterIds] = useState<string[] | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);

  // Read filter state from URL (stable primitives)
  const search = searchParams.get("q") ?? "";
  const mealParam = searchParams.get("meal") ?? "";
  const cuisineParam = searchParams.get("cuisine") ?? "";
  const dietParam = searchParams.get("diet") ?? "";
  const showFavorites = searchParams.get("favs") === "1";
  const cookTimeRange = searchParams.get("cookTime") ?? null;
  const nutritionFilter = searchParams.get("nutrition") ?? null;

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

  // Apply collection filter first
  const collectionRecipes = useMemo(
    () => collectionFilterIds ? recipes.filter((r) => collectionFilterIds.includes(r.id)) : recipes,
    [recipes, collectionFilterIds]
  );

  // Apply search/tag filters from URL on top of collection filter
  const displayRecipes = useMemo(() => {
    const selectedMealTypes = new Set(mealParam.split(",").filter(Boolean));
    const selectedCuisines = new Set(cuisineParam.split(",").filter(Boolean));
    const selectedDietary = new Set(dietParam.split(",").filter(Boolean));

    return collectionRecipes.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.tags.some((t) => t.name.toLowerCase().includes(q))) return false;
      }
      if (showFavorites && !r.isFavorite) return false;
      if (selectedMealTypes.size > 0 && !r.tags.some((t) => t.type === "MEAL_TYPE" && selectedMealTypes.has(t.name))) return false;
      if (selectedCuisines.size > 0 && !r.tags.some((t) => t.type === "CUISINE" && selectedCuisines.has(t.name))) return false;
      if (selectedDietary.size > 0 && !r.tags.some((t) => t.type === "DIETARY" && selectedDietary.has(t.name))) return false;
      if (cookTimeRange) {
        const ct = r.cookTime;
        if (ct === null) return false;
        if (cookTimeRange === "under30" && ct > 30) return false;
        if (cookTimeRange === "30to60" && (ct < 30 || ct > 60)) return false;
        if (cookTimeRange === "60to120" && (ct < 60 || ct > 120)) return false;
        if (cookTimeRange === "over120" && ct < 120) return false;
      }
      if (nutritionFilter) {
        const n = r.nutrition;
        if (!n || n.calories === null) return false;
        if (nutritionFilter === "under300" && n.calories > 300) return false;
        if (nutritionFilter === "300to500" && (n.calories < 300 || n.calories > 500)) return false;
        if (nutritionFilter === "500to700" && (n.calories < 500 || n.calories > 700)) return false;
        if (nutritionFilter === "over700" && n.calories < 700) return false;
        if (nutritionFilter === "highProtein" && (n.protein === null || n.protein < 25)) return false;
        if (nutritionFilter === "lowCarb" && (n.carbs === null || n.carbs > 20)) return false;
        if (nutritionFilter === "lowCalorie" && n.calories > 400) return false;
      }
      return true;
    });
  }, [collectionRecipes, search, mealParam, cuisineParam, dietParam, showFavorites, cookTimeRange, nutritionFilter]);

  return (
    <div onTouchStart={handlePullStart} onTouchEnd={handlePullEnd}>
      {refreshing && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <SeasonalShelf />
      <FilterBar recipes={collectionRecipes} />
      <CollectionBar
        onFilter={(ids, label) => {
          setCollectionFilterIds(ids);
          setActiveCollection(label);
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

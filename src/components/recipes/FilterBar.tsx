"use client";

import { useState, useMemo } from "react";
import Tag from "@/components/ui/Tag";
import type { RecipeCardData } from "@/types";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Appetizer"];
const CUISINES = [
  "Italian", "Mexican", "Thai", "Japanese", "Indian", "French",
  "American", "Mediterranean", "Chinese", "Korean", "Vietnamese",
  "Middle Eastern", "Greek",
];
const DIETARY = [
  "Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free",
  "Keto", "Paleo", "Nut-Free", "Low-Carb",
];

interface FilterBarProps {
  recipes: RecipeCardData[];
  onFilter: (filtered: RecipeCardData[]) => void;
}

export default function FilterBar({ recipes, onFilter }: FilterBarProps) {
  const [search, setSearch] = useState("");
  const [selectedMealTypes, setSelectedMealTypes] = useState<Set<string>>(new Set());
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(new Set());
  const [selectedDietary, setSelectedDietary] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);

  // Determine which tags actually exist in the user's recipes
  const availableTags = useMemo(() => {
    const mealTypes = new Set<string>();
    const cuisines = new Set<string>();
    const dietary = new Set<string>();
    for (const r of recipes) {
      for (const t of r.tags) {
        if (t.type === "MEAL_TYPE") mealTypes.add(t.name);
        else if (t.type === "CUISINE") cuisines.add(t.name);
        else if (t.type === "DIETARY") dietary.add(t.name);
      }
    }
    return {
      mealTypes: MEAL_TYPES.filter((m) => mealTypes.has(m)),
      cuisines: CUISINES.filter((c) => cuisines.has(c)),
      dietary: DIETARY.filter((d) => dietary.has(d)),
    };
  }, [recipes]);

  const hasActiveFilters =
    search || selectedMealTypes.size > 0 || selectedCuisines.size > 0 || selectedDietary.size > 0 || showFavorites;

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setFn(next);
    applyFilters(search, selectedMealTypes, selectedCuisines, selectedDietary, showFavorites, next, value, set, setFn);
  }

  function applyFilters(
    searchVal: string,
    mealTypes: Set<string>,
    cuisines: Set<string>,
    dietary: Set<string>,
    favs: boolean,
    // For the toggle that just changed, pass updated set
    changedSet?: Set<string>,
    changedValue?: string,
    originalSet?: Set<string>,
    setFn?: (s: Set<string>) => void,
  ) {
    // Determine effective sets (the toggled one needs the updated version)
    const effectiveMealTypes = setFn === setSelectedMealTypes && changedSet ? changedSet : mealTypes;
    const effectiveCuisines = setFn === setSelectedCuisines && changedSet ? changedSet : cuisines;
    const effectiveDietary = setFn === setSelectedDietary && changedSet ? changedSet : dietary;

    const filtered = recipes.filter((r) => {
      // Search
      if (searchVal) {
        const q = searchVal.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesTags = r.tags.some((t) => t.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTags) return false;
      }

      // Favorites
      if (favs && !r.isFavorite) return false;

      // Meal type filter
      if (effectiveMealTypes.size > 0) {
        const hasMatch = r.tags.some((t) => t.type === "MEAL_TYPE" && effectiveMealTypes.has(t.name));
        if (!hasMatch) return false;
      }

      // Cuisine filter
      if (effectiveCuisines.size > 0) {
        const hasMatch = r.tags.some((t) => t.type === "CUISINE" && effectiveCuisines.has(t.name));
        if (!hasMatch) return false;
      }

      // Dietary filter
      if (effectiveDietary.size > 0) {
        const hasMatch = r.tags.some((t) => t.type === "DIETARY" && effectiveDietary.has(t.name));
        if (!hasMatch) return false;
      }

      return true;
    });

    onFilter(filtered);
  }

  function clearAll() {
    setSearch("");
    setSelectedMealTypes(new Set());
    setSelectedCuisines(new Set());
    setSelectedDietary(new Set());
    setShowFavorites(false);
    onFilter(recipes);
  }

  function handleSearch(value: string) {
    setSearch(value);
    applyFilters(value, selectedMealTypes, selectedCuisines, selectedDietary, showFavorites);
  }

  function handleFavorites() {
    const next = !showFavorites;
    setShowFavorites(next);
    applyFilters(search, selectedMealTypes, selectedCuisines, selectedDietary, next);
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search recipes..."
          className="w-full border border-gray-300 pl-10 pr-4 py-2.5 font-sans text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors"
        />
      </div>

      {/* Filter pills */}
      <div className="space-y-3">
        {/* Favorites + Meal types */}
        {(availableTags.mealTypes.length > 0) && (
          <div className="flex gap-2 flex-wrap items-center">
            <Tag
              label="Favorites"
              active={showFavorites}
              onClick={handleFavorites}
            />
            <span className="w-px h-4 bg-gray-300" />
            {availableTags.mealTypes.map((m) => (
              <Tag
                key={m}
                label={m}
                active={selectedMealTypes.has(m)}
                onClick={() => toggle(selectedMealTypes, setSelectedMealTypes, m)}
              />
            ))}
          </div>
        )}

        {/* Cuisines */}
        {availableTags.cuisines.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {availableTags.cuisines.map((c) => (
              <Tag
                key={c}
                label={c}
                active={selectedCuisines.has(c)}
                onClick={() => toggle(selectedCuisines, setSelectedCuisines, c)}
              />
            ))}
          </div>
        )}

        {/* Dietary */}
        {availableTags.dietary.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {availableTags.dietary.map((d) => (
              <Tag
                key={d}
                label={d}
                active={selectedDietary.has(d)}
                onClick={() => toggle(selectedDietary, setSelectedDietary, d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="font-sans text-xs text-gray-500 hover:text-black transition-colors"
        >
          Clear all filters &times;
        </button>
      )}
    </div>
  );
}

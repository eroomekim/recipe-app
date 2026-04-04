"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive all filter state from URL
  const search = searchParams.get("q") ?? "";
  const selectedMealTypes = useMemo(
    () => new Set(searchParams.get("meal")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const selectedCuisines = useMemo(
    () => new Set(searchParams.get("cuisine")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const selectedDietary = useMemo(
    () => new Set(searchParams.get("diet")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const showFavorites = searchParams.get("favs") === "1";
  const cookTimeRange = searchParams.get("cookTime") ?? null;
  const nutritionFilter = searchParams.get("nutrition") ?? null;

  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

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
    search || selectedMealTypes.size > 0 || selectedCuisines.size > 0 || selectedDietary.size > 0 || showFavorites || cookTimeRange || nutritionFilter;

  const activeFilterCount =
    selectedMealTypes.size + selectedCuisines.size + selectedDietary.size +
    (showFavorites ? 1 : 0) + (cookTimeRange ? 1 : 0) + (nutritionFilter ? 1 : 0);

  function handleSearch(value: string) {
    updateParams({ q: value || null });
  }

  function handleFavorites() {
    updateParams({ favs: showFavorites ? null : "1" });
  }

  function handleCookTime(range: string) {
    updateParams({ cookTime: cookTimeRange === range ? null : range });
  }

  function handleNutrition(value: string) {
    updateParams({ nutrition: nutritionFilter === value ? null : value });
  }

  function toggleMealType(value: string) {
    const next = new Set(selectedMealTypes);
    if (next.has(value)) next.delete(value); else next.add(value);
    updateParams({ meal: next.size > 0 ? Array.from(next).join(",") : null });
  }

  function toggleCuisine(value: string) {
    const next = new Set(selectedCuisines);
    if (next.has(value)) next.delete(value); else next.add(value);
    updateParams({ cuisine: next.size > 0 ? Array.from(next).join(",") : null });
  }

  function toggleDietary(value: string) {
    const next = new Set(selectedDietary);
    if (next.has(value)) next.delete(value); else next.add(value);
    updateParams({ diet: next.size > 0 ? Array.from(next).join(",") : null });
  }

  function clearAll() {
    router.replace(pathname, { scroll: false });
  }

  useEffect(() => {
    const filtered = recipes.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesTags = r.tags.some((t) => t.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTags) return false;
      }
      if (showFavorites && !r.isFavorite) return false;
      if (selectedMealTypes.size > 0) {
        if (!r.tags.some((t) => t.type === "MEAL_TYPE" && selectedMealTypes.has(t.name))) return false;
      }
      if (selectedCuisines.size > 0) {
        if (!r.tags.some((t) => t.type === "CUISINE" && selectedCuisines.has(t.name))) return false;
      }
      if (selectedDietary.size > 0) {
        if (!r.tags.some((t) => t.type === "DIETARY" && selectedDietary.has(t.name))) return false;
      }
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
    onFilter(filtered);
  }, [recipes, search, showFavorites, selectedMealTypes, selectedCuisines, selectedDietary, cookTimeRange, nutritionFilter, onFilter]);

  return (
    <div className="mb-8 space-y-3">
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search recipes..."
            aria-label="Search recipes"
            className="w-full border border-gray-500 pl-10 pr-4 py-2.5 font-sans text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
          className={`flex items-center gap-1.5 px-3 py-2.5 border font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? "border-black bg-black text-white"
              : "border-gray-300 text-gray-600 hover:border-black hover:text-black"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 bg-white text-black text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter summary (when panel is closed) */}
      {!filtersOpen && hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {showFavorites && <Tag label="Favorites" active onClick={handleFavorites} />}
          {Array.from(selectedMealTypes).map((m) => (
            <Tag key={m} label={m} active onClick={() => toggleMealType(m)} />
          ))}
          {Array.from(selectedCuisines).map((c) => (
            <Tag key={c} label={c} active onClick={() => toggleCuisine(c)} />
          ))}
          {Array.from(selectedDietary).map((d) => (
            <Tag key={d} label={d} active onClick={() => toggleDietary(d)} />
          ))}
          {cookTimeRange && (
            <Tag
              label={
                cookTimeRange === "under30" ? "Under 30 min" :
                cookTimeRange === "30to60" ? "30–60 min" :
                cookTimeRange === "60to120" ? "1–2 hours" : "2+ hours"
              }
              active
              onClick={() => handleCookTime(cookTimeRange)}
            />
          )}
          {nutritionFilter && (
            <Tag
              label={
                nutritionFilter === "under300" ? "Under 300 cal" :
                nutritionFilter === "300to500" ? "300–500 cal" :
                nutritionFilter === "500to700" ? "500–700 cal" :
                nutritionFilter === "over700" ? "700+ cal" :
                nutritionFilter === "highProtein" ? "High Protein" :
                nutritionFilter === "lowCarb" ? "Low Carb" : "Low Calorie"
              }
              active
              onClick={() => handleNutrition(nutritionFilter)}
            />
          )}
          <button
            onClick={clearAll}
            className="font-sans text-xs text-gray-500 hover:text-black transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expandable filter panel */}
      {filtersOpen && (
        <div className="border border-gray-200 p-4 space-y-4">
          {/* Favorites + Meal types */}
          {availableTags.mealTypes.length > 0 && (
            <div>
              <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-600 block mb-2">Meal Type</span>
              <div className="flex gap-2 flex-wrap items-center">
                <Tag label="Favorites" active={showFavorites} onClick={handleFavorites} />
                {availableTags.mealTypes.map((m) => (
                  <Tag key={m} label={m} active={selectedMealTypes.has(m)} onClick={() => toggleMealType(m)} />
                ))}
              </div>
            </div>
          )}

          {/* Cuisines */}
          {availableTags.cuisines.length > 0 && (
            <div>
              <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-600 block mb-2">Cuisine</span>
              <div className="flex gap-2 flex-wrap">
                {availableTags.cuisines.map((c) => (
                  <Tag key={c} label={c} active={selectedCuisines.has(c)} onClick={() => toggleCuisine(c)} />
                ))}
              </div>
            </div>
          )}

          {/* Dietary */}
          {availableTags.dietary.length > 0 && (
            <div>
              <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-600 block mb-2">Dietary</span>
              <div className="flex gap-2 flex-wrap">
                {availableTags.dietary.map((d) => (
                  <Tag key={d} label={d} active={selectedDietary.has(d)} onClick={() => toggleDietary(d)} />
                ))}
              </div>
            </div>
          )}

          {/* Cook time */}
          <div>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-600 block mb-2">Cook Time</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "under30", label: "Under 30 min" },
                { key: "30to60", label: "30–60 min" },
                { key: "60to120", label: "1–2 hours" },
                { key: "over120", label: "2+ hours" },
              ].map((range) => (
                <Tag key={range.key} label={range.label} active={cookTimeRange === range.key} onClick={() => handleCookTime(range.key)} />
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-600 block mb-2">Nutrition</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "under300", label: "Under 300 cal" },
                { key: "300to500", label: "300–500 cal" },
                { key: "500to700", label: "500–700 cal" },
                { key: "over700", label: "700+ cal" },
                { key: "highProtein", label: "High Protein" },
                { key: "lowCarb", label: "Low Carb" },
                { key: "lowCalorie", label: "Low Calorie" },
              ].map((item) => (
                <Tag key={item.key} label={item.label} active={nutritionFilter === item.key} onClick={() => handleNutrition(item.key)} />
              ))}
            </div>
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="font-sans text-xs text-gray-500 hover:text-black transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

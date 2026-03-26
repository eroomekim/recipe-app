# Smart Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five local-first smart features: ingredient matching ("What Can I Cook?"), seasonal recipe suggestions, nutrition filtering, similar recipe recommendations, and cook time adjustments.

**Architecture:** All features use database queries and client-side logic — no AI API calls at runtime. Ingredient matching and seasonal suggestions get new API routes; nutrition filtering and cook time adjustments work entirely client-side with existing data. Similar recipes gets a new API route computing Jaccard similarity.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma, Tailwind CSS, existing design system patterns.

---

## File Structure

### New Files
- `src/lib/seasonal-data.ts` — Static ingredient seasonality + cultural association mappings
- `src/lib/cook-time-adjuster.ts` — Deterministic cook time adjustment multipliers
- `src/lib/ingredient-matcher.ts` — Ingredient name normalization and matching logic
- `src/app/pantry/page.tsx` — "What Can I Cook?" page
- `src/components/pantry/PantrySearch.tsx` — Client component: ingredient input + results display
- `src/components/recipes/SeasonalShelf.tsx` — Horizontal scrollable "In Season" row
- `src/components/recipes/SimilarRecipes.tsx` — Similar recipes section for recipe detail view
- `src/components/recipes/CookTimeAdjuster.tsx` — Adjusted cook time badge with equipment popover
- `src/app/api/recipes/match-ingredients/route.ts` — Ingredient matching API
- `src/app/api/recipes/seasonal/route.ts` — Seasonal suggestions API
- `src/app/api/recipes/[id]/similar/route.ts` — Similar recipe recommendations API

### Modified Files
- `prisma/schema.prisma` — Add `altitude` and `equipment` to UserSettings
- `src/types/index.ts` — Add new types for matching, seasonal, similar, cook time, and extend UserSettingsData
- `src/app/api/settings/route.ts` — Include new altitude/equipment fields
- `src/hooks/useSettings.ts` — No changes needed (generic patch already works)
- `src/app/api/recipes/route.ts` — Include nutrition fields in RecipeCardData response
- `src/components/recipes/FilterBar.tsx` — Add nutrition filter pills
- `src/components/recipes/RecipeCollection.tsx` — Add SeasonalShelf above grid
- `src/components/recipes/RecipePage.tsx` — Add SimilarRecipes section + CookTimeAdjuster
- `src/components/layout/Navbar.tsx` — Add "Pantry" nav link
- `src/components/layout/MobileMenu.tsx` — Add "Pantry" nav link
- `src/app/settings/page.tsx` — Add "My Kitchen" section

---

## Task 1: Schema & Type Updates

**Files:**
- Modify: `prisma/schema.prisma:21-31`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add altitude and equipment fields to UserSettings model**

In `prisma/schema.prisma`, add two fields to the `UserSettings` model after `cookingKeepAwake`:

```prisma
model UserSettings {
  id                  String  @id @default(cuid())
  userId              String  @unique
  measurementSystem   String  @default("imperial") // "imperial" | "metric"
  maxDisplayImages    Int     @default(8)
  defaultServings     Int?    // null = use recipe original
  cookingAutoReadAloud Boolean @default(false)
  cookingKeepAwake    Boolean @default(true)
  altitude            String? // "sea_level" | "moderate" | "high" | "very_high"
  equipment           String[] @default([])

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Run migration**

Run:
```bash
pnpm prisma migrate dev --name add-kitchen-settings
```

Expected: Migration creates successfully, adding `altitude` (nullable String) and `equipment` (String array with empty default) columns to `UserSettings`.

- [ ] **Step 3: Add new types to `src/types/index.ts`**

Add after the `DEFAULT_SETTINGS` export:

```typescript
// --- Smart Features Types ---

export interface IngredientMatchResult {
  recipe: RecipeCardData;
  matchedCount: number;
  totalCount: number;
  coveragePercent: number;
  missingIngredients: string[];
}

export interface SeasonalRecipe {
  recipe: RecipeCardData;
  seasonalScore: number;
  seasonalIngredients: string[];
}

export interface SimilarRecipe {
  id: string;
  title: string;
  images: string[];
  cookTime: number | null;
  sharedIngredientCount: number;
  similarityScore: number;
  tags: { name: string; type: "MEAL_TYPE" | "CUISINE" | "DIETARY" }[];
}

export type AltitudeSetting = "sea_level" | "moderate" | "high" | "very_high";
export type EquipmentType = "convection_oven" | "instant_pot" | "air_fryer" | "slow_cooker";

export interface CookTimeAdjustment {
  originalMinutes: number;
  adjustedMinutes: number;
  label: string;
}
```

- [ ] **Step 4: Extend UserSettingsData and DEFAULT_SETTINGS**

Update the existing `UserSettingsData` interface and `DEFAULT_SETTINGS`:

```typescript
export interface UserSettingsData {
  measurementSystem: "imperial" | "metric";
  maxDisplayImages: number;
  defaultServings: number | null;
  cookingAutoReadAloud: boolean;
  cookingKeepAwake: boolean;
  altitude: AltitudeSetting | null;
  equipment: EquipmentType[];
}

export const DEFAULT_SETTINGS: UserSettingsData = {
  measurementSystem: "imperial",
  maxDisplayImages: 8,
  defaultServings: null,
  cookingAutoReadAloud: false,
  cookingKeepAwake: true,
  altitude: null,
  equipment: [],
};
```

- [ ] **Step 5: Extend RecipeCardData with nutrition fields**

Add nutrition fields to the existing `RecipeCardData` interface:

```typescript
export interface RecipeCardData {
  id: string;
  title: string;
  images: string[];
  cookTime: number | null;
  createdAt: string;
  ingredientCount: number;
  instructionCount: number;
  firstInstruction: string | null;
  isFavorite: boolean;
  tags: {
    name: string;
    type: "MEAL_TYPE" | "CUISINE" | "DIETARY";
  }[];
  nutrition: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
  } | null;
}
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/types/index.ts
git commit -m "feat: add kitchen settings schema and smart feature types"
```

---

## Task 2: Update Settings API & UI

**Files:**
- Modify: `src/app/api/settings/route.ts`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Update GET handler to include new fields**

In `src/app/api/settings/route.ts`, update both the fallback response (line 15-21) and the found-settings response (line 24-30) to include `altitude` and `equipment`:

Fallback (no settings found):
```typescript
  if (!settings) {
    return NextResponse.json({
      measurementSystem: "imperial",
      maxDisplayImages: 8,
      defaultServings: null,
      cookingAutoReadAloud: false,
      cookingKeepAwake: true,
      altitude: null,
      equipment: [],
    });
  }
```

Found settings:
```typescript
  return NextResponse.json({
    measurementSystem: settings.measurementSystem,
    maxDisplayImages: settings.maxDisplayImages,
    defaultServings: settings.defaultServings,
    cookingAutoReadAloud: settings.cookingAutoReadAloud,
    cookingKeepAwake: settings.cookingKeepAwake,
    altitude: settings.altitude,
    equipment: settings.equipment,
  });
```

- [ ] **Step 2: Update PUT handler to persist new fields**

In the `PUT` handler, update both `update` and `create` blocks:

```typescript
  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      measurementSystem: body.measurementSystem,
      maxDisplayImages: body.maxDisplayImages,
      defaultServings: body.defaultServings,
      cookingAutoReadAloud: body.cookingAutoReadAloud,
      cookingKeepAwake: body.cookingKeepAwake,
      altitude: body.altitude,
      equipment: body.equipment,
    },
    create: {
      userId: user.id,
      measurementSystem: body.measurementSystem ?? "imperial",
      maxDisplayImages: body.maxDisplayImages ?? 8,
      defaultServings: body.defaultServings ?? null,
      cookingAutoReadAloud: body.cookingAutoReadAloud ?? false,
      cookingKeepAwake: body.cookingKeepAwake ?? true,
      altitude: body.altitude ?? null,
      equipment: body.equipment ?? [],
    },
  });

  return NextResponse.json({
    measurementSystem: settings.measurementSystem,
    maxDisplayImages: settings.maxDisplayImages,
    defaultServings: settings.defaultServings,
    cookingAutoReadAloud: settings.cookingAutoReadAloud,
    cookingKeepAwake: settings.cookingKeepAwake,
    altitude: settings.altitude,
    equipment: settings.equipment,
  });
```

- [ ] **Step 3: Add "My Kitchen" section to settings page**

In `src/app/settings/page.tsx`, add the following section after the "Cooking Mode" section (after the closing `</section>` at line 192) and before the "Extraction Usage" section:

```tsx
      {/* My Kitchen */}
      <section className="mb-10">
        <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">
          My Kitchen
        </h2>

        {/* Altitude */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div>
            <div className="font-serif text-base text-black">Altitude</div>
            <div className="font-sans text-xs text-gray-500 mt-0.5">
              Adjusts baking times for your elevation
            </div>
          </div>
          <select
            value={settings.altitude ?? ""}
            onChange={(e) => update({ altitude: (e.target.value || null) as UserSettingsData["altitude"] })}
            className="font-sans text-sm border border-gray-300 px-3 py-2 bg-white text-black focus:outline-none focus:border-black transition-colors"
          >
            <option value="">Not set</option>
            <option value="sea_level">Sea Level (0–2,000 ft)</option>
            <option value="moderate">Moderate (2,000–5,000 ft)</option>
            <option value="high">High (5,000–7,500 ft)</option>
            <option value="very_high">Very High (7,500+ ft)</option>
          </select>
        </div>

        {/* Equipment */}
        <div className="py-4 border-b border-gray-200">
          <div className="mb-3">
            <div className="font-serif text-base text-black">Equipment</div>
            <div className="font-sans text-xs text-gray-500 mt-0.5">
              Cook times adjust based on your appliances
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "convection_oven", label: "Convection Oven" },
              { key: "instant_pot", label: "Instant Pot" },
              { key: "air_fryer", label: "Air Fryer" },
              { key: "slow_cooker", label: "Slow Cooker" },
            ] as const).map(({ key, label }) => {
              const active = settings.equipment.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => {
                    const next = active
                      ? settings.equipment.filter((e) => e !== key)
                      : [...settings.equipment, key];
                    update({ equipment: next });
                  }}
                  className={`px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? "bg-black text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>
```

Note: You'll need to add the import for `UserSettingsData` at the top of the file:

```typescript
import type { UserSettingsData } from "@/types";
```

- [ ] **Step 4: Verify settings page renders**

Run:
```bash
pnpm dev
```

Open `http://localhost:3000/settings` and verify:
- "My Kitchen" section appears between "Cooking Mode" and "Extraction Usage"
- Altitude dropdown works and persists
- Equipment toggle pills work and persist

- [ ] **Step 5: Commit**

```bash
git add src/app/api/settings/route.ts src/app/settings/page.tsx
git commit -m "feat: add My Kitchen settings (altitude + equipment)"
```

---

## Task 3: Include Nutrition in Recipe List API

**Files:**
- Modify: `src/app/api/recipes/route.ts:52-66`
- Modify: `src/app/recipes/page.tsx:44-58`

- [ ] **Step 1: Add nutrition fields to GET response in API route**

In `src/app/api/recipes/route.ts`, update the mapping at lines 52-66 to include nutrition:

```typescript
  const result: RecipeCardData[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    images: r.images,
    cookTime: r.cookTime,
    createdAt: r.createdAt.toISOString(),
    ingredientCount: r._count.ingredients,
    instructionCount: r._count.instructions,
    firstInstruction: r.instructions[0]?.text ?? null,
    isFavorite: r.isFavorite,
    tags: r.tags.map((rt) => ({
      name: rt.tag.name,
      type: rt.tag.type,
    })),
    nutrition: r.nutritionCalories !== null ? {
      calories: r.nutritionCalories,
      protein: r.nutritionProtein,
      carbs: r.nutritionCarbs,
      fat: r.nutritionFat,
      fiber: r.nutritionFiber,
      sugar: r.nutritionSugar,
      sodium: r.nutritionSodium,
    } : null,
  }));
```

- [ ] **Step 2: Add nutrition fields to server-side page query**

In `src/app/recipes/page.tsx`, update the mapping at lines 44-58 identically:

```typescript
  const recipeCards: RecipeCardData[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    images: r.images,
    cookTime: r.cookTime,
    createdAt: r.createdAt.toISOString(),
    ingredientCount: r._count.ingredients,
    instructionCount: r._count.instructions,
    firstInstruction: r.instructions[0]?.text ?? null,
    isFavorite: r.isFavorite,
    tags: r.tags.map((rt) => ({
      name: rt.tag.name,
      type: rt.tag.type,
    })),
    nutrition: r.nutritionCalories !== null ? {
      calories: r.nutritionCalories,
      protein: r.nutritionProtein,
      carbs: r.nutritionCarbs,
      fat: r.nutritionFat,
      fiber: r.nutritionFiber,
      sugar: r.nutritionSugar,
      sodium: r.nutritionSodium,
    } : null,
  }));
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/recipes/route.ts src/app/recipes/page.tsx
git commit -m "feat: include nutrition fields in recipe list response"
```

---

## Task 4: Nutrition Filtering in FilterBar

**Files:**
- Modify: `src/components/recipes/FilterBar.tsx`

- [ ] **Step 1: Add nutrition filter state**

In `FilterBar.tsx`, add new state after `cookTimeRange` (line 30):

```typescript
  const [nutritionFilter, setNutritionFilter] = useState<string | null>(null);
```

- [ ] **Step 2: Update `hasActiveFilters` to include nutrition**

Replace line 51-52:

```typescript
  const hasActiveFilters =
    search || selectedMealTypes.size > 0 || selectedCuisines.size > 0 || selectedDietary.size > 0 || showFavorites || cookTimeRange || nutritionFilter;
```

- [ ] **Step 3: Add nutrition filtering logic to `applyFilters`**

Update the `applyFilters` function signature to accept a nutrition parameter, and add nutrition filtering inside the `recipes.filter` callback. Add a new parameter after `cookTime`:

```typescript
  function applyFilters(
    searchVal: string,
    mealTypes: Set<string>,
    cuisines: Set<string>,
    dietary: Set<string>,
    favs: boolean,
    changedSet?: Set<string>,
    changedValue?: string,
    originalSet?: Set<string>,
    setFn?: (s: Set<string>) => void,
    cookTime?: string | null,
    nutrition?: string | null,
  ) {
    const effectiveMealTypes = setFn === setSelectedMealTypes && changedSet ? changedSet : mealTypes;
    const effectiveCuisines = setFn === setSelectedCuisines && changedSet ? changedSet : cuisines;
    const effectiveDietary = setFn === setSelectedDietary && changedSet ? changedSet : dietary;
    const effectiveCookTime = cookTime !== undefined ? cookTime : cookTimeRange;
    const effectiveNutrition = nutrition !== undefined ? nutrition : nutritionFilter;

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

      // Cook time range filter
      if (effectiveCookTime) {
        const ct = r.cookTime;
        if (ct === null) return false;
        if (effectiveCookTime === "under30" && ct > 30) return false;
        if (effectiveCookTime === "30to60" && (ct < 30 || ct > 60)) return false;
        if (effectiveCookTime === "60to120" && (ct < 60 || ct > 120)) return false;
        if (effectiveCookTime === "over120" && ct < 120) return false;
      }

      // Nutrition filter
      if (effectiveNutrition) {
        const n = r.nutrition;
        if (!n || n.calories === null) return false;
        if (effectiveNutrition === "under300" && n.calories > 300) return false;
        if (effectiveNutrition === "300to500" && (n.calories < 300 || n.calories > 500)) return false;
        if (effectiveNutrition === "500to700" && (n.calories < 500 || n.calories > 700)) return false;
        if (effectiveNutrition === "over700" && n.calories < 700) return false;
        if (effectiveNutrition === "highProtein" && (n.protein === null || n.protein < 25)) return false;
        if (effectiveNutrition === "lowCarb" && (n.carbs === null || n.carbs > 20)) return false;
        if (effectiveNutrition === "lowCalorie" && n.calories > 400) return false;
      }

      return true;
    });

    onFilter(filtered);
  }
```

- [ ] **Step 4: Add nutrition filter handler and update clearAll**

Add after `handleFavorites` function:

```typescript
  function handleNutrition(value: string) {
    const next = nutritionFilter === value ? null : value;
    setNutritionFilter(next);
    applyFilters(search, selectedMealTypes, selectedCuisines, selectedDietary, showFavorites, undefined, undefined, undefined, undefined, undefined, next);
  }
```

Update `clearAll` to reset nutrition:

```typescript
  function clearAll() {
    setSearch("");
    setSelectedMealTypes(new Set());
    setSelectedCuisines(new Set());
    setSelectedDietary(new Set());
    setShowFavorites(false);
    setCookTimeRange(null);
    setNutritionFilter(null);
    onFilter(recipes);
  }
```

- [ ] **Step 5: Update `activeFilterCount`**

```typescript
  const activeFilterCount =
    selectedMealTypes.size + selectedCuisines.size + selectedDietary.size +
    (showFavorites ? 1 : 0) + (cookTimeRange ? 1 : 0) + (nutritionFilter ? 1 : 0);
```

- [ ] **Step 6: Add nutrition filter UI in the expandable filter panel**

Add the following section inside the `{filtersOpen && (...)}` block, after the Cook Time section and before the "Clear all" button:

```tsx
          {/* Nutrition */}
          <div>
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">Nutrition</span>
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
```

- [ ] **Step 7: Add nutrition pill to active filter summary**

In the `{!filtersOpen && hasActiveFilters && (...)}` block, add before the "Clear all" button:

```tsx
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
```

- [ ] **Step 8: Verify filtering works**

Run:
```bash
pnpm dev
```

Open `/recipes`, expand filters, and verify nutrition filter pills appear and filter correctly. Recipes without nutrition data should be hidden when any nutrition filter is active.

- [ ] **Step 9: Commit**

```bash
git add src/components/recipes/FilterBar.tsx
git commit -m "feat: add nutrition filter pills to FilterBar"
```

---

## Task 5: Ingredient Matcher Library

**Files:**
- Create: `src/lib/ingredient-matcher.ts`

- [ ] **Step 1: Create the ingredient matcher module**

Create `src/lib/ingredient-matcher.ts`:

```typescript
/**
 * Normalizes an ingredient name for matching:
 * - lowercase
 * - trim whitespace
 * - strip trailing 's' or 'es' for basic plural handling
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();
  // Strip common plural suffixes
  if (normalized.endsWith("ies")) {
    normalized = normalized.slice(0, -3) + "y"; // berries -> berry
  } else if (normalized.endsWith("ves")) {
    normalized = normalized.slice(0, -3) + "f"; // halves -> half
  } else if (normalized.endsWith("es") && normalized.length > 3) {
    normalized = normalized.slice(0, -2); // tomatoes -> tomato
  } else if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 2) {
    normalized = normalized.slice(0, -1); // onions -> onion
  }
  return normalized;
}

/**
 * Checks if a user-provided ingredient matches a recipe ingredient name.
 * User input is checked as a substring of the stored name.
 * e.g., "chicken" matches "chicken breast", "chicken thigh"
 */
export function ingredientMatches(userInput: string, recipeIngredientName: string): boolean {
  const normalizedInput = normalizeIngredientName(userInput);
  const normalizedRecipe = normalizeIngredientName(recipeIngredientName);
  return normalizedRecipe.includes(normalizedInput);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ingredient-matcher.ts
git commit -m "feat: add ingredient name normalization and matching"
```

---

## Task 6: Ingredient Matching API Route

**Files:**
- Create: `src/app/api/recipes/match-ingredients/route.ts`

- [ ] **Step 1: Create the match-ingredients API route**

Create `src/app/api/recipes/match-ingredients/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ingredientMatches } from "@/lib/ingredient-matcher";
import type { IngredientMatchResult, RecipeCardData } from "@/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ingredientsParam = searchParams.get("ingredients");
  const threshold = parseInt(searchParams.get("threshold") ?? "60", 10);

  if (!ingredientsParam) {
    return NextResponse.json({ error: "ingredients parameter required" }, { status: 400 });
  }

  const userIngredients = ingredientsParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (userIngredients.length === 0) {
    return NextResponse.json({ error: "At least one ingredient required" }, { status: 400 });
  }

  // Fetch all recipes with their ingredients
  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
      instructions: { orderBy: { order: "asc" }, take: 1 },
      _count: { select: { ingredients: true, instructions: true } },
    },
  });

  const results: IngredientMatchResult[] = [];

  for (const recipe of recipes) {
    const recipeIngredientNames = recipe.ingredients
      .map((ing) => ing.name)
      .filter((name): name is string => name !== null);

    if (recipeIngredientNames.length === 0) continue;

    const matched: string[] = [];
    const missing: string[] = [];

    for (const recipeIngName of recipeIngredientNames) {
      const isMatched = userIngredients.some((userIng) =>
        ingredientMatches(userIng, recipeIngName)
      );
      if (isMatched) {
        matched.push(recipeIngName);
      } else {
        missing.push(recipeIngName);
      }
    }

    const coveragePercent = Math.round((matched.length / recipeIngredientNames.length) * 100);

    if (coveragePercent >= threshold) {
      const card: RecipeCardData = {
        id: recipe.id,
        title: recipe.title,
        images: recipe.images,
        cookTime: recipe.cookTime,
        createdAt: recipe.createdAt.toISOString(),
        ingredientCount: recipe._count.ingredients,
        instructionCount: recipe._count.instructions,
        firstInstruction: recipe.instructions[0]?.text ?? null,
        isFavorite: recipe.isFavorite,
        tags: recipe.tags.map((rt) => ({ name: rt.tag.name, type: rt.tag.type })),
        nutrition: recipe.nutritionCalories !== null ? {
          calories: recipe.nutritionCalories,
          protein: recipe.nutritionProtein,
          carbs: recipe.nutritionCarbs,
          fat: recipe.nutritionFat,
          fiber: recipe.nutritionFiber,
          sugar: recipe.nutritionSugar,
          sodium: recipe.nutritionSodium,
        } : null,
      };

      results.push({
        recipe: card,
        matchedCount: matched.length,
        totalCount: recipeIngredientNames.length,
        coveragePercent,
        missingIngredients: missing,
      });
    }
  }

  // Sort by coverage descending, then by total ingredient count ascending
  results.sort((a, b) => {
    if (b.coveragePercent !== a.coveragePercent) return b.coveragePercent - a.coveragePercent;
    return a.totalCount - b.totalCount;
  });

  return NextResponse.json(results);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/recipes/match-ingredients/route.ts
git commit -m "feat: add ingredient matching API route"
```

---

## Task 7: Pantry Page & Search Component

**Files:**
- Create: `src/app/pantry/page.tsx`
- Create: `src/components/pantry/PantrySearch.tsx`

- [ ] **Step 1: Create the pantry page**

Create `src/app/pantry/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PantrySearch from "@/components/pantry/PantrySearch";

export default async function PantryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all unique ingredient names from user's recipes for autocomplete
  const ingredients = await prisma.ingredient.findMany({
    where: { recipe: { userId: user.id }, name: { not: null } },
    select: { name: true },
    distinct: ["name"],
  });

  const knownIngredients = ingredients
    .map((i) => i.name!)
    .sort();

  return (
    <main className="max-w-article mx-auto px-6 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold leading-none mb-2">
        What Can I Cook?
      </h1>
      <p className="font-serif text-lg text-gray-600 italic mb-8">
        Enter the ingredients you have on hand.
      </p>
      <PantrySearch knownIngredients={knownIngredients} />
    </main>
  );
}
```

- [ ] **Step 2: Create the PantrySearch component**

Create `src/components/pantry/PantrySearch.tsx`:

```tsx
"use client";

import { useState, useRef, useMemo } from "react";
import { X, Search, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import type { IngredientMatchResult } from "@/types";

interface PantrySearchProps {
  knownIngredients: string[];
}

export default function PantrySearch({ knownIngredients }: PantrySearchProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<IngredientMatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const [expandedMissing, setExpandedMissing] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const q = inputValue.toLowerCase();
    return knownIngredients
      .filter((name) => name.toLowerCase().includes(q) && !selectedIngredients.includes(name))
      .slice(0, 8);
  }, [inputValue, knownIngredients, selectedIngredients]);

  function addIngredient(name: string) {
    if (!selectedIngredients.includes(name)) {
      setSelectedIngredients([...selectedIngredients, name]);
    }
    setInputValue("");
    inputRef.current?.focus();
  }

  function removeIngredient(name: string) {
    setSelectedIngredients(selectedIngredients.filter((i) => i !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        addIngredient(suggestions[0]);
      } else {
        addIngredient(inputValue.trim());
      }
    }
    if (e.key === "Backspace" && !inputValue && selectedIngredients.length > 0) {
      removeIngredient(selectedIngredients[selectedIngredients.length - 1]);
    }
  }

  async function search() {
    if (selectedIngredients.length === 0) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ingredients: selectedIngredients.join(","),
        threshold: String(threshold),
      });
      const res = await fetch(`/api/recipes/match-ingredients?${params}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleMissing(id: string) {
    const next = new Set(expandedMissing);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedMissing(next);
  }

  return (
    <div>
      {/* Input area */}
      <div className="border border-gray-300 p-3 mb-4 focus-within:border-black transition-colors">
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedIngredients.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-black text-white font-sans text-xs font-semibold uppercase tracking-wide"
            >
              {name}
              <button onClick={() => removeIngredient(name)} aria-label={`Remove ${name}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedIngredients.length === 0 ? "Type an ingredient..." : "Add another..."}
          className="w-full font-sans text-sm text-black placeholder:text-gray-500 focus:outline-none"
        />
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            {suggestions.map((name) => (
              <button
                key={name}
                onClick={() => addIngredient(name)}
                className="block w-full text-left px-2 py-1.5 font-sans text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Threshold slider + search button */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <label className="font-sans text-xs text-gray-500 uppercase tracking-wider block mb-1">
            Min. coverage: {threshold}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-black"
          />
        </div>
        <button
          onClick={search}
          disabled={selectedIngredients.length === 0 || loading}
          className="bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {loading ? "Searching..." : "Find Recipes"}
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div>
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
            {results.length} {results.length === 1 ? "Recipe" : "Recipes"} Found
          </h2>

          {results.length === 0 ? (
            <p className="font-serif text-lg text-gray-500 italic py-8 text-center">
              No recipes match your ingredients at {threshold}% coverage.
              Try lowering the threshold or adding more ingredients.
            </p>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.recipe.id} className="flex gap-4 group">
                  {/* Thumbnail */}
                  <Link href={`/recipes/${result.recipe.id}`} className="shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 overflow-hidden bg-gray-50">
                      {result.recipe.images[0] && (
                        <img
                          src={result.recipe.images[0]}
                          alt={result.recipe.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
                        />
                      )}
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/recipes/${result.recipe.id}`}>
                      <h3 className="font-display text-xl leading-none font-bold text-black group-hover:opacity-80 transition-opacity">
                        {result.recipe.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="font-sans text-xs font-bold text-black">
                        {result.matchedCount}/{result.totalCount} ingredients
                      </span>
                      <span className="font-sans text-xs text-gray-500">
                        {result.coveragePercent}% match
                      </span>
                      {result.recipe.cookTime && (
                        <span className="font-sans text-xs text-gray-500">
                          {result.recipe.cookTime} min
                        </span>
                      )}
                    </div>

                    {/* Missing ingredients */}
                    {result.missingIngredients.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleMissing(result.recipe.id)}
                          className="font-sans text-xs text-gray-400 hover:text-black transition-colors flex items-center gap-1"
                        >
                          {expandedMissing.has(result.recipe.id) ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          {result.missingIngredients.length} missing
                        </button>
                        {expandedMissing.has(result.recipe.id) && (
                          <ul className="mt-1 space-y-0.5">
                            {result.missingIngredients.map((name) => (
                              <li key={name} className="font-serif text-sm text-gray-500">
                                {name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add "Pantry" to Navbar**

In `src/components/layout/Navbar.tsx`, add a Pantry link after the Groceries link (after line 69):

```tsx
              <Link
                href="/pantry"
                className="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
              >
                Pantry
              </Link>
```

- [ ] **Step 4: Add "Pantry" to MobileMenu**

In `src/components/layout/MobileMenu.tsx`, add after the Grocery List link (after line 58):

```tsx
          <Link
            href="/pantry"
            onClick={onClose}
            className="font-sans text-base font-bold uppercase tracking-normal text-gray-900"
          >
            Pantry
          </Link>
```

- [ ] **Step 5: Verify pantry page works end-to-end**

Run:
```bash
pnpm dev
```

Open `/pantry`. Verify:
- Ingredient input with autocomplete works
- Typing and pressing Enter adds ingredients
- Backspace removes the last ingredient
- Coverage threshold slider works
- "Find Recipes" button queries API and shows results
- Missing ingredients expand/collapse
- Nav link appears in both desktop and mobile menus

- [ ] **Step 6: Commit**

```bash
git add src/app/pantry/page.tsx src/components/pantry/PantrySearch.tsx src/components/layout/Navbar.tsx src/components/layout/MobileMenu.tsx
git commit -m "feat: add Pantry page for ingredient-based recipe matching"
```

---

## Task 8: Seasonal Data & API Route

**Files:**
- Create: `src/lib/seasonal-data.ts`
- Create: `src/app/api/recipes/seasonal/route.ts`

- [ ] **Step 1: Create the seasonal data module**

Create `src/lib/seasonal-data.ts`:

```typescript
/**
 * Maps common ingredient names (lowercase) to their peak season months (1-12).
 */
export const INGREDIENT_SEASONS: Record<string, number[]> = {
  // Spring (March-May)
  asparagus: [3, 4, 5],
  artichoke: [3, 4, 5],
  pea: [3, 4, 5, 6],
  radish: [3, 4, 5],
  rhubarb: [3, 4, 5, 6],
  "spring onion": [3, 4, 5],
  spinach: [3, 4, 5, 9, 10],
  arugula: [3, 4, 5, 9, 10],
  leek: [1, 2, 3, 10, 11, 12],
  mint: [4, 5, 6, 7, 8],

  // Summer (June-August)
  tomato: [6, 7, 8, 9],
  corn: [6, 7, 8],
  zucchini: [6, 7, 8],
  "bell pepper": [6, 7, 8, 9],
  pepper: [6, 7, 8, 9],
  cucumber: [6, 7, 8],
  eggplant: [7, 8, 9],
  peach: [6, 7, 8],
  watermelon: [6, 7, 8],
  blueberry: [6, 7, 8],
  strawberry: [5, 6, 7],
  raspberry: [6, 7, 8],
  basil: [6, 7, 8, 9],
  cherry: [5, 6, 7],
  fig: [7, 8, 9],
  melon: [6, 7, 8],
  okra: [6, 7, 8, 9],
  "green bean": [6, 7, 8],

  // Fall (September-November)
  "butternut squash": [9, 10, 11],
  squash: [9, 10, 11],
  pumpkin: [9, 10, 11],
  apple: [9, 10, 11],
  pear: [9, 10, 11],
  cranberry: [9, 10, 11],
  "sweet potato": [9, 10, 11, 12],
  "brussels sprout": [9, 10, 11, 12],
  cauliflower: [9, 10, 11],
  grape: [8, 9, 10],
  pomegranate: [10, 11, 12],
  parsnip: [10, 11, 12, 1, 2],
  turnip: [10, 11, 12],
  beet: [9, 10, 11],

  // Winter (December-February)
  "citrus": [12, 1, 2, 3],
  orange: [12, 1, 2, 3],
  lemon: [12, 1, 2, 3],
  lime: [12, 1, 2, 3],
  grapefruit: [12, 1, 2, 3],
  kale: [11, 12, 1, 2],
  cabbage: [11, 12, 1, 2, 3],
  "collard green": [12, 1, 2],
  celery: [10, 11, 12, 1],
  "winter squash": [10, 11, 12, 1],

  // Year-round staples with peak seasons
  carrot: [6, 7, 8, 9, 10],
  onion: [8, 9, 10],
  potato: [9, 10, 11],
  mushroom: [9, 10, 11],
  broccoli: [9, 10, 11, 3, 4, 5],
  garlic: [7, 8, 9],
  ginger: [9, 10, 11],
  avocado: [3, 4, 5, 6],
};

/**
 * Cultural/holiday meal type and cuisine associations by month.
 * Maps month number to tag names that are culturally relevant.
 */
export const CULTURAL_ASSOCIATIONS: Record<number, { mealTypes: string[]; cuisines: string[]; keywords: string[] }> = {
  1: { mealTypes: ["Dinner"], cuisines: [], keywords: ["soup", "stew", "braise", "warm", "comfort"] },
  2: { mealTypes: ["Dinner", "Dessert"], cuisines: ["French", "Italian"], keywords: ["chocolate", "romantic", "comfort"] },
  3: { mealTypes: ["Lunch", "Dinner"], cuisines: [], keywords: ["fresh", "spring", "light", "salad"] },
  4: { mealTypes: ["Brunch", "Dinner"], cuisines: [], keywords: ["spring", "Easter", "brunch", "lamb"] },
  5: { mealTypes: ["Lunch", "Dinner"], cuisines: ["Mexican"], keywords: ["grill", "fresh", "spring", "salad"] },
  6: { mealTypes: ["Lunch", "Dinner"], cuisines: ["Mediterranean", "Greek"], keywords: ["grill", "barbecue", "salad", "fresh"] },
  7: { mealTypes: ["Lunch", "Dinner", "Snack"], cuisines: ["American", "Mediterranean"], keywords: ["grill", "barbecue", "cold", "fresh", "salad", "summer"] },
  8: { mealTypes: ["Lunch", "Dinner"], cuisines: ["Mediterranean", "Italian"], keywords: ["grill", "summer", "fresh", "tomato"] },
  9: { mealTypes: ["Dinner"], cuisines: [], keywords: ["roast", "harvest", "fall", "apple", "comfort"] },
  10: { mealTypes: ["Dinner", "Dessert", "Snack"], cuisines: [], keywords: ["pumpkin", "spice", "fall", "harvest", "soup"] },
  11: { mealTypes: ["Dinner"], cuisines: ["American"], keywords: ["roast", "thanksgiving", "turkey", "pie", "bake", "comfort"] },
  12: { mealTypes: ["Dinner", "Dessert", "Appetizer"], cuisines: [], keywords: ["bake", "cookie", "holiday", "roast", "comfort", "warm"] },
};

/**
 * Check if an ingredient name matches any seasonal ingredient for the given month.
 * Returns the matched seasonal key or null.
 */
export function getSeasonalMatch(ingredientName: string, month: number): string | null {
  const normalized = ingredientName.toLowerCase().trim();
  for (const [seasonal, months] of Object.entries(INGREDIENT_SEASONS)) {
    if (months.includes(month) && normalized.includes(seasonal)) {
      return seasonal;
    }
  }
  return null;
}
```

- [ ] **Step 2: Create the seasonal API route**

Create `src/app/api/recipes/seasonal/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getSeasonalMatch, CULTURAL_ASSOCIATIONS } from "@/lib/seasonal-data";
import type { SeasonalRecipe, RecipeCardData } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const cultural = CULTURAL_ASSOCIATIONS[currentMonth] ?? { mealTypes: [], cuisines: [], keywords: [] };

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    include: {
      ingredients: { select: { name: true } },
      tags: { include: { tag: true } },
      instructions: { orderBy: { order: "asc" }, take: 1 },
      _count: { select: { ingredients: true, instructions: true } },
    },
  });

  const scored: SeasonalRecipe[] = [];

  for (const recipe of recipes) {
    const ingredientNames = recipe.ingredients
      .map((i) => i.name)
      .filter((n): n is string => n !== null);

    // Score ingredient seasonality
    const seasonalMatches: string[] = [];
    for (const name of ingredientNames) {
      const match = getSeasonalMatch(name, currentMonth);
      if (match) seasonalMatches.push(match);
    }

    const ingredientScore = ingredientNames.length > 0
      ? seasonalMatches.length / ingredientNames.length
      : 0;

    // Score cultural/tag relevance
    let culturalScore = 0;
    const recipeTags = recipe.tags.map((rt) => rt.tag);
    const mealTypeTags = recipeTags.filter((t) => t.type === "MEAL_TYPE").map((t) => t.name);
    const cuisineTags = recipeTags.filter((t) => t.type === "CUISINE").map((t) => t.name);

    if (cultural.mealTypes.some((mt) => mealTypeTags.includes(mt))) culturalScore += 0.5;
    if (cultural.cuisines.some((c) => cuisineTags.includes(c))) culturalScore += 0.5;

    // Check title against cultural keywords
    const titleLower = recipe.title.toLowerCase();
    if (cultural.keywords.some((kw) => titleLower.includes(kw))) culturalScore += 0.3;

    culturalScore = Math.min(culturalScore, 1);

    // Combined score: 70% ingredient, 30% cultural
    const totalScore = (ingredientScore * 0.7) + (culturalScore * 0.3);

    // Require at least 30% seasonal ingredient coverage OR cultural relevance
    if (ingredientScore >= 0.3 || culturalScore >= 0.5) {
      const card: RecipeCardData = {
        id: recipe.id,
        title: recipe.title,
        images: recipe.images,
        cookTime: recipe.cookTime,
        createdAt: recipe.createdAt.toISOString(),
        ingredientCount: recipe._count.ingredients,
        instructionCount: recipe._count.instructions,
        firstInstruction: recipe.instructions[0]?.text ?? null,
        isFavorite: recipe.isFavorite,
        tags: recipe.tags.map((rt) => ({ name: rt.tag.name, type: rt.tag.type })),
        nutrition: recipe.nutritionCalories !== null ? {
          calories: recipe.nutritionCalories,
          protein: recipe.nutritionProtein,
          carbs: recipe.nutritionCarbs,
          fat: recipe.nutritionFat,
          fiber: recipe.nutritionFiber,
          sugar: recipe.nutritionSugar,
          sodium: recipe.nutritionSodium,
        } : null,
      };

      scored.push({
        recipe: card,
        seasonalScore: totalScore,
        seasonalIngredients: [...new Set(seasonalMatches)],
      });
    }
  }

  // Sort by score descending, take top 10
  scored.sort((a, b) => b.seasonalScore - a.seasonalScore);
  const top = scored.slice(0, 10);

  return NextResponse.json(top);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/seasonal-data.ts src/app/api/recipes/seasonal/route.ts
git commit -m "feat: add seasonal data mappings and seasonal suggestions API"
```

---

## Task 9: Seasonal Shelf Component

**Files:**
- Create: `src/components/recipes/SeasonalShelf.tsx`
- Modify: `src/components/recipes/RecipeCollection.tsx`

- [ ] **Step 1: Create the SeasonalShelf component**

Create `src/components/recipes/SeasonalShelf.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SeasonalRecipe } from "@/types";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SeasonalShelf() {
  const [recipes, setRecipes] = useState<SeasonalRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recipes/seasonal")
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || recipes.length === 0) return null;

  const monthName = MONTH_NAMES[new Date().getMonth() + 1];

  return (
    <div className="mb-8">
      <h2 className="font-display text-sm font-normal text-red tracking-normal mb-3">
        In Season — {monthName}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {recipes.map(({ recipe, seasonalIngredients }) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="shrink-0 w-44 group"
          >
            <div className="aspect-3/2 overflow-hidden bg-gray-50 mb-2">
              {recipe.images[0] && (
                <img
                  src={recipe.images[0]}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
                />
              )}
            </div>
            <h3 className="font-display text-sm leading-tight font-bold text-black group-hover:opacity-80 transition-opacity line-clamp-2">
              {recipe.title}
            </h3>
            {seasonalIngredients.length > 0 && (
              <p className="font-sans text-xs text-gray-500 mt-1 truncate">
                {seasonalIngredients.slice(0, 3).join(", ")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add SeasonalShelf to RecipeCollection**

In `src/components/recipes/RecipeCollection.tsx`, import and render the SeasonalShelf above the FilterBar.

Add the import:
```typescript
import SeasonalShelf from "./SeasonalShelf";
```

Add `<SeasonalShelf />` as the first child inside the fragment, before `<FilterBar>`:

```tsx
  return (
    <>
      <SeasonalShelf />
      <FilterBar
        recipes={collectionRecipes}
        onFilter={(filtered) => setSearchFiltered(filtered)}
      />
      <CollectionBar
        onFilter={(ids, label) => {
          setCollectionFilterIds(ids);
          setActiveCollection(label);
          setSearchFiltered(null);
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
          <p className="font-serif text-lg text-gray-500 italic">
            No recipes match your filters
          </p>
        </div>
      ) : (
        <RecipeGrid recipes={displayRecipes} />
      )}
    </>
  );
```

- [ ] **Step 3: Verify the seasonal shelf renders**

Run:
```bash
pnpm dev
```

Open `/recipes` and verify the "In Season" row appears above the filter bar with relevant recipes.

- [ ] **Step 4: Commit**

```bash
git add src/components/recipes/SeasonalShelf.tsx src/components/recipes/RecipeCollection.tsx
git commit -m "feat: add seasonal recipe suggestions shelf to recipe collection"
```

---

## Task 10: Similar Recipes API & Component

**Files:**
- Create: `src/app/api/recipes/[id]/similar/route.ts`
- Create: `src/components/recipes/SimilarRecipes.tsx`
- Modify: `src/components/recipes/RecipePage.tsx`

- [ ] **Step 1: Create the similar recipes API route**

Create `src/app/api/recipes/[id]/similar/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { normalizeIngredientName } from "@/lib/ingredient-matcher";
import type { SimilarRecipe } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "5", 10);

  // Get the target recipe's ingredients
  const targetRecipe = await prisma.recipe.findUnique({
    where: { id, userId: user.id },
    include: { ingredients: { select: { name: true } } },
  });

  if (!targetRecipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const targetNames = new Set(
    targetRecipe.ingredients
      .map((i) => i.name)
      .filter((n): n is string => n !== null)
      .map(normalizeIngredientName)
  );

  if (targetNames.size === 0) {
    return NextResponse.json([]);
  }

  // Get all other recipes with their ingredients
  const otherRecipes = await prisma.recipe.findMany({
    where: { userId: user.id, id: { not: id } },
    include: {
      ingredients: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });

  const results: SimilarRecipe[] = [];

  for (const recipe of otherRecipes) {
    const recipeNames = new Set(
      recipe.ingredients
        .map((i) => i.name)
        .filter((n): n is string => n !== null)
        .map(normalizeIngredientName)
    );

    if (recipeNames.size === 0) continue;

    // Jaccard similarity: |intersection| / |union|
    let intersectionCount = 0;
    for (const name of targetNames) {
      if (recipeNames.has(name)) intersectionCount++;
    }

    if (intersectionCount === 0) continue;

    const unionSize = targetNames.size + recipeNames.size - intersectionCount;
    const similarity = intersectionCount / unionSize;

    results.push({
      id: recipe.id,
      title: recipe.title,
      images: recipe.images,
      cookTime: recipe.cookTime,
      sharedIngredientCount: intersectionCount,
      similarityScore: Math.round(similarity * 100) / 100,
      tags: recipe.tags.map((rt) => ({ name: rt.tag.name, type: rt.tag.type })),
    });
  }

  results.sort((a, b) => b.similarityScore - a.similarityScore);

  return NextResponse.json(results.slice(0, limit));
}
```

- [ ] **Step 2: Create the SimilarRecipes component**

Create `src/components/recipes/SimilarRecipes.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Divider from "@/components/ui/Divider";
import type { SimilarRecipe } from "@/types";

interface SimilarRecipesProps {
  recipeId: string;
}

export default function SimilarRecipes({ recipeId }: SimilarRecipesProps) {
  const [recipes, setRecipes] = useState<SimilarRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/recipes/${recipeId}/similar?limit=5`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecipes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [recipeId]);

  if (loading || recipes.length === 0) return null;

  return (
    <>
      <Divider className="my-6" />
      <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
        Similar Recipes
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide">
        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="shrink-0 w-36 group"
          >
            <div className="aspect-3/2 overflow-hidden bg-gray-50 mb-2">
              {recipe.images[0] && (
                <img
                  src={recipe.images[0]}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
                />
              )}
            </div>
            <h3 className="font-display text-sm leading-tight font-bold text-black group-hover:opacity-80 transition-opacity line-clamp-2">
              {recipe.title}
            </h3>
            <span className="font-sans text-xs text-gray-500 mt-1 block">
              {recipe.sharedIngredientCount} shared ingredient{recipe.sharedIngredientCount !== 1 ? "s" : ""}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Add SimilarRecipes to RecipePage**

In `src/components/recipes/RecipePage.tsx`, import SimilarRecipes:

```typescript
import SimilarRecipes from "./SimilarRecipes";
```

Add the component at the end of the main content area, just before the closing `</div>` of `px-5 pb-8` (before the ImageLightbox at line 481):

```tsx
        {/* Similar recipes */}
        <SimilarRecipes recipeId={recipe.id} />
```

- [ ] **Step 4: Verify similar recipes appear**

Run:
```bash
pnpm dev
```

Open any recipe detail page and verify:
- "Similar Recipes" section appears at the bottom if there are similar recipes
- Horizontal scrollable row shows recipes with shared ingredient count
- Clicking a similar recipe navigates to that recipe

- [ ] **Step 5: Commit**

```bash
git add src/app/api/recipes/[id]/similar/route.ts src/components/recipes/SimilarRecipes.tsx src/components/recipes/RecipePage.tsx
git commit -m "feat: add similar recipe recommendations based on ingredient overlap"
```

---

## Task 11: Cook Time Adjuster

**Files:**
- Create: `src/lib/cook-time-adjuster.ts`
- Create: `src/components/recipes/CookTimeAdjuster.tsx`
- Modify: `src/components/recipes/RecipePage.tsx`

- [ ] **Step 1: Create the cook time adjuster module**

Create `src/lib/cook-time-adjuster.ts`:

```typescript
import type { AltitudeSetting, EquipmentType, CookTimeAdjustment } from "@/types";

interface AdjustmentRule {
  timeMultiplier: number;
  label: string;
}

const EQUIPMENT_ADJUSTMENTS: Record<EquipmentType, AdjustmentRule> = {
  convection_oven: { timeMultiplier: 0.85, label: "Convection Oven" },
  air_fryer: { timeMultiplier: 0.80, label: "Air Fryer" },
  instant_pot: { timeMultiplier: 0.40, label: "Instant Pot" },
  slow_cooker: { timeMultiplier: 4.0, label: "Slow Cooker" },
};

const ALTITUDE_ADJUSTMENTS: Record<AltitudeSetting, AdjustmentRule> = {
  sea_level: { timeMultiplier: 1.0, label: "Sea Level" },
  moderate: { timeMultiplier: 1.0, label: "Moderate Altitude" },
  high: { timeMultiplier: 1.10, label: "High Altitude" },
  very_high: { timeMultiplier: 1.20, label: "Very High Altitude" },
};

export const EQUIPMENT_OPTIONS: { key: EquipmentType; label: string }[] = [
  { key: "convection_oven", label: "Convection Oven" },
  { key: "air_fryer", label: "Air Fryer" },
  { key: "instant_pot", label: "Instant Pot" },
  { key: "slow_cooker", label: "Slow Cooker" },
];

/**
 * Compute an adjusted cook time based on equipment and altitude.
 * Equipment multiplier is applied first, then altitude compounds on top.
 * Returns null if no adjustments apply.
 */
export function adjustCookTime(
  originalMinutes: number,
  equipment: EquipmentType | null,
  altitude: AltitudeSetting | null,
): CookTimeAdjustment | null {
  let multiplier = 1.0;
  const labels: string[] = [];

  if (equipment) {
    const rule = EQUIPMENT_ADJUSTMENTS[equipment];
    multiplier *= rule.timeMultiplier;
    labels.push(rule.label);
  }

  if (altitude && altitude !== "sea_level" && altitude !== "moderate") {
    const rule = ALTITUDE_ADJUSTMENTS[altitude];
    multiplier *= rule.timeMultiplier;
    labels.push(rule.label);
  }

  if (multiplier === 1.0) return null;

  return {
    originalMinutes,
    adjustedMinutes: Math.round(originalMinutes * multiplier),
    label: labels.join(" + "),
  };
}
```

- [ ] **Step 2: Create the CookTimeAdjuster component**

Create `src/components/recipes/CookTimeAdjuster.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { adjustCookTime, EQUIPMENT_OPTIONS } from "@/lib/cook-time-adjuster";
import { useSettings } from "@/hooks/useSettings";
import type { EquipmentType, CookTimeAdjustment } from "@/types";

interface CookTimeAdjusterProps {
  cookTime: number;
}

export default function CookTimeAdjuster({ cookTime }: CookTimeAdjusterProps) {
  const { settings } = useSettings();
  const [overrideEquipment, setOverrideEquipment] = useState<EquipmentType | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popoverOpen]);

  // Use override if set, otherwise default from settings
  const activeEquipment = overrideEquipment ?? (settings.equipment.length > 0 ? settings.equipment[0] as EquipmentType : null);
  const adjustment = adjustCookTime(cookTime, activeEquipment, settings.altitude);

  if (!adjustment) return null;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className="flex items-center gap-1 font-sans text-xs text-gray-500 hover:text-black transition-colors"
      >
        → ~{adjustment.adjustedMinutes} min
        <span className="text-gray-400">({adjustment.label})</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {popoverOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 py-1 min-w-[180px] z-50 shadow-sm">
          <div className="px-3 py-1.5 border-b border-gray-200">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Adjust for equipment
            </span>
          </div>
          <button
            onClick={() => { setOverrideEquipment(null); setPopoverOpen(false); }}
            className={`block w-full text-left px-3 py-2 font-sans text-sm transition-colors ${
              !overrideEquipment ? "text-black font-semibold bg-gray-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Default ({settings.equipment.length > 0 ? settings.equipment.map((e) =>
              EQUIPMENT_OPTIONS.find((o) => o.key === e)?.label
            ).join(", ") : "None"})
          </button>
          {EQUIPMENT_OPTIONS.map(({ key, label }) => {
            const adj = adjustCookTime(cookTime, key, settings.altitude);
            return (
              <button
                key={key}
                onClick={() => { setOverrideEquipment(key); setPopoverOpen(false); }}
                className={`block w-full text-left px-3 py-2 font-sans text-sm transition-colors ${
                  overrideEquipment === key ? "text-black font-semibold bg-gray-50" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
                {adj && <span className="text-gray-400 ml-1">~{adj.adjustedMinutes} min</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add CookTimeAdjuster to RecipePage**

In `src/components/recipes/RecipePage.tsx`, import the component:

```typescript
import CookTimeAdjuster from "./CookTimeAdjuster";
```

In the `statsBlock` (around line 131-186), add the CookTimeAdjuster right after the cook time display. Replace the cook time block:

Find this code inside `statsBlock`:
```tsx
      {recipe.cookTime && (
        <div className="pr-5">
          <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">Cook Time</div>
          <div className="font-sans text-lg font-bold text-black mt-0.5">{recipe.cookTime} mins</div>
        </div>
      )}
```

Replace with:
```tsx
      {recipe.cookTime && (
        <div className="pr-5">
          <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">Cook Time</div>
          <div className="font-sans text-lg font-bold text-black mt-0.5">{recipe.cookTime} mins</div>
          <CookTimeAdjuster cookTime={recipe.cookTime} />
        </div>
      )}
```

- [ ] **Step 4: Verify cook time adjuster works**

Run:
```bash
pnpm dev
```

1. Go to `/settings` and set altitude to "High" and enable "Convection Oven"
2. Open a recipe with a cook time
3. Verify adjusted time appears below the cook time: "→ ~38 min (Convection Oven + High Altitude)"
4. Click the adjustment to open the equipment popover
5. Select a different equipment and verify the time changes

- [ ] **Step 5: Commit**

```bash
git add src/lib/cook-time-adjuster.ts src/components/recipes/CookTimeAdjuster.tsx src/components/recipes/RecipePage.tsx
git commit -m "feat: add cook time adjustments for altitude and equipment"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run the dev server and verify all five features**

```bash
pnpm dev
```

Verify each feature:

1. **Pantry / Ingredient Matching**: Navigate to `/pantry`, add ingredients, search, see ranked results with coverage percentages
2. **Seasonal Shelf**: Go to `/recipes`, see "In Season — {Month}" row above the filter bar
3. **Nutrition Filtering**: Expand filters, see nutrition pills, filter by calorie range / high protein / low carb
4. **Similar Recipes**: Open any recipe detail, scroll down to see "Similar Recipes" section
5. **Cook Time Adjustments**: Set kitchen equipment in settings, view adjusted times on recipes

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors in new/modified files.

- [ ] **Step 4: Commit any remaining fixes**

If any type or lint issues were found and fixed:

```bash
git add -A
git commit -m "fix: resolve type and lint issues from smart features"
```

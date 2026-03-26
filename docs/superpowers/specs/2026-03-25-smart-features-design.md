# Smart Features Design Spec

> Five local-first smart features for the recipe app: ingredient matching, seasonal suggestions, nutrition filtering, similar recipe recommendations, and cook time adjustments.

**Date:** 2026-03-25
**Approach:** Local-first — all features use database queries and deterministic logic, no AI API calls at runtime.

---

## 1. "What Can I Cook?" — Ingredient Matching

### Overview

Users enter ingredients they have on hand and see recipes ranked by ingredient coverage.

### UX Flow

1. New page at `/pantry` accessible from the nav bar
2. Multi-input field with autocomplete sourced from the user's recipe collection's known ingredients
3. On submit, recipes are scored by ingredient coverage percentage and displayed as a ranked list
4. Each result shows: recipe title, hero image, coverage badge ("8/10 ingredients"), and an expandable "Missing" list
5. Default threshold filter: only show recipes with ≥ 60% coverage (adjustable via slider)
6. Clicking a result opens the recipe in the normal booklet view

### Matching Logic

- Normalize ingredient names: lowercase, strip plurals (s/es), trim whitespace
- Match against the `Ingredient.name` field (already parsed and stored on recipe save)
- Partial/substring matching: user input is checked as a substring of stored ingredient names (e.g., user enters "chicken" → matches "chicken breast", "chicken thigh"). The reverse is not applied — entering "chicken breast" does not match a recipe ingredient named "chicken".
- Sort results by coverage percentage descending, then by total ingredient count ascending (simpler recipes ranked higher at equal coverage)

### API

`GET /api/recipes/match-ingredients?ingredients=chicken,garlic,soy+sauce&threshold=60`

Returns recipes with `coveragePercent`, `matchedCount`, `totalCount`, `missingIngredients[]`, sorted by coverage descending.

---

## 2. Seasonal Recipe Suggestions

### Overview

Automatic suggestions based on ingredient seasonality and cultural/holiday associations for the current month.

### Data Model

A static mapping file at `src/lib/seasonal-data.ts` containing:

- **Ingredient seasonality**: ~60-80 common ingredients mapped to peak months (e.g., `"asparagus": [3, 4, 5]`, `"butternut squash": [9, 10, 11]`)
- **Cultural/holiday associations**: Month-based tags (e.g., December → comfort food, soups, baking; July → grilling, salads, fresh; November → roasting, Thanksgiving-style dishes)

### How It Works

1. "In Season" horizontal scrollable row displayed above the main recipe grid on `/recipes`
2. On page load, determine current month
3. Score recipes by seasonal relevance:
   - Count ingredients that are in-season / total ingredients = ingredient seasonality score
   - Check tag matches against cultural associations for the month = cultural relevance score
   - Combined score: 70% ingredient seasonality + 30% cultural/tag relevance
4. Recipes with ≥ 30% seasonal ingredients qualify
5. Top 10 shown in the shelf, labeled "In Season — {Month Name}"

### API

`GET /api/recipes/seasonal` — returns scored recipes for the current month. No user input required.

---

## 3. Nutrition Filtering

### Overview

Add nutrition-based filter pills to the existing FilterBar, enabling users to filter by calorie range and macronutrient thresholds.

### Filter Options (toggle pills in FilterBar)

- **Calorie ranges**: Under 300, 300-500, 500-700, 700+
- **High Protein**: protein ≥ 25g per serving
- **Low Carb**: carbs ≤ 20g per serving
- **Low Calorie**: calories ≤ 400 per serving

Styled as toggle pills matching the existing filter pill pattern (inactive: gray background, active: black background).

### Implementation

- **Client-side filtering** (consistent with existing FilterBar approach)
- Include the 7 nutrition fields (calories, protein, carbs, fat, fiber, sugar, sodium) in the recipe list API response — negligible payload increase (~7 numbers per recipe)
- Recipes without nutrition data are excluded when any nutrition filter is active, with a note: "X recipes hidden — no nutrition data"
- Combines with all existing filters (search, meal type, cuisine, dietary, cook time, favorites)

### API Changes

Extend `GET /api/recipes` response to include nutrition fields in each recipe card object:
```json
{
  "calories": 450,
  "protein": 32,
  "carbs": 28,
  "fat": 18,
  "fiber": 4,
  "sugar": 6,
  "sodium": 580
}
```

---

## 4. Similar Recipe Recommendations

### Overview

Show related recipes on each recipe's detail view based on ingredient overlap using Jaccard similarity.

### Algorithm

- **Jaccard similarity**: `|intersection| / |union|` of two recipes' ingredient name sets
- Normalize names before comparison (lowercase, strip plurals, trim)
- Filter out recipes with 0 overlap
- Sort by Jaccard score descending, return top 5

### UX

- Section at the bottom of RecipePage / booklet view, below instructions and images
- Section header: "Similar Recipes" with a thin horizontal rule above
- Horizontal scrollable row of compact recipe cards (hero image + title + "7 shared ingredients")
- Clicking a card opens that recipe in the booklet view

### API

`GET /api/recipes/[id]/similar?limit=5`

Returns:
```json
[
  {
    "id": "...",
    "title": "...",
    "images": ["..."],
    "sharedIngredientCount": 7,
    "similarityScore": 0.58
  }
]
```

### Performance

With a typical home collection (50-500 recipes), computing Jaccard across all recipes per view is fast in a single DB query + JS computation. No caching needed at this scale.

---

## 5. Cook Time Adjustments

### Overview

Adjust displayed cook times based on user's altitude and kitchen equipment. Adjustments are display-only and never modify stored recipe data.

### User Profile — "My Kitchen" (Settings Page)

New section on the existing `/settings` page:

- **Altitude**: dropdown — Sea Level (0-2000ft), Moderate (2000-5000ft), High (5000-7500ft), Very High (7500ft+)
- **Equipment**: toggles for Convection Oven, Instant Pot, Air Fryer, Slow Cooker

### Schema Addition (UserSettings model)

```
altitude    String?   // "sea_level" | "moderate" | "high" | "very_high"
equipment   String[]  // ["convection_oven", "instant_pot", "air_fryer", "slow_cooker"]
```

### Adjustment Multipliers

| Factor | Time Adjustment | Temp Adjustment |
|--------|----------------|-----------------|
| Convection Oven | -15% | -25°F |
| Air Fryer | -20% | -25°F |
| Instant Pot | -60% | N/A |
| Slow Cooker | +300% | N/A |
| High Altitude (5000-7500ft) | +10% (baking) | — |
| Very High Altitude (7500ft+) | +20% (baking) | — |

When multiple adjustments apply (e.g., high altitude + convection), they compound.

### UX

- On recipe view, if user has kitchen settings configured, show an "Adjusted Cook Time" badge next to the original cook time
- Display format: "45 min → ~38 min (convection oven)"
- Per-recipe override: a dropdown/popover on the cook time lets the user select different equipment for that specific recipe
- Override is ephemeral (not persisted) — it just changes the display for that viewing session

### Implementation

Computed entirely client-side from user settings + recipe cook time. No new API route needed — uses existing `GET/PUT /api/settings`.

---

## Cross-Cutting Concerns

### Navigation Changes

- Add "Pantry" link to the nav bar (for ingredient matching feature)
- The other four features integrate into existing pages (recipes grid, recipe detail, settings)

### No New Database Models

All features work with existing models plus two new fields on `UserSettings` (`altitude`, `equipment`). No new tables required.

### Performance

- All runtime computation is local (DB queries + JS logic)
- No external API calls at read time
- Seasonal data and adjustment multipliers are static constants
- Similar recipes computation is bounded by collection size (typically < 500 recipes)

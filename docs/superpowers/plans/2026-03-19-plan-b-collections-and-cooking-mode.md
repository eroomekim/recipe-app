# Plan B: Smart Collections & Cooking Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-created collections with rule-based smart groupings, AI-curated seasonal collections, and a full-screen cooking mode with recipe scaling, timers, and optional voice/guided features.

**Architecture:** Extends the Prisma schema with Collection, RecipeCollection, and SmartCollectionCache models. Adds collection CRUD API routes and a smart-collections computation layer (rule-based + Anthropic API for seasonal/featured). Builds a full-screen CookingMode component with two tiers: simple (wake lock, large text, step-by-step) and guided (voice commands, timers, checklist, read-aloud). Recipe scaling uses the existing parsed ingredient fields (quantity/unit/name) from Plan A.

**Tech Stack:** Next.js 16, TypeScript, Prisma 6, Anthropic SDK, Supabase Auth, Tailwind v4, Vitest, Screen Wake Lock API, Web Speech API

**Spec:** `docs/superpowers/specs/2026-03-19-additional-features-design.md` (Features 4 & 5)

---

## File Structure

### New files:

| File | Responsibility |
|------|---------------|
| `src/lib/ingredient-scaler.ts` | Scale ingredient quantities by a multiplier |
| `src/lib/ingredient-scaler.test.ts` | Tests for ingredient scaler |
| `src/lib/smart-collections.ts` | Compute rule-based smart collections from recipe data |
| `src/lib/smart-collections.test.ts` | Tests for rule-based smart collections |
| `src/lib/ai-collections.ts` | AI-curated seasonal/featured collections via Anthropic API |
| `src/app/api/collections/route.ts` | GET (list), POST (create) user collections |
| `src/app/api/collections/[id]/route.ts` | PUT, DELETE user collections |
| `src/app/api/collections/[id]/recipes/route.ts` | POST (add), DELETE (remove) recipe from collection |
| `src/app/api/smart-collections/route.ts` | GET computed smart collections for current user |
| `src/components/recipes/CollectionBar.tsx` | Horizontal scrollable collection strip above grid |
| `src/components/recipes/CreateCollectionModal.tsx` | Modal for creating/naming a new collection |
| `src/components/recipes/AddToCollectionButton.tsx` | Button in booklet view to add recipe to collection |
| `src/components/cooking/CookingMode.tsx` | Full-screen cooking mode wrapper |
| `src/components/cooking/CookingStep.tsx` | Single step display with large text |
| `src/components/cooking/IngredientDrawer.tsx` | Collapsible ingredient list with scaling + checklist |
| `src/components/cooking/CookingTimer.tsx` | Inline timer with countdown and alert |
| `src/components/cooking/VoiceControl.tsx` | Web Speech API voice command handler |
| `src/hooks/useWakeLock.ts` | Screen Wake Lock API hook |
| `src/hooks/useTimer.ts` | Timer countdown hook |

### Modified files:

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add Collection, RecipeCollection, SmartCollectionCache models; add collections relation to Recipe and User |
| `src/types/index.ts` | Add CollectionData, SmartCollectionData, ScaledIngredient types |
| `src/app/recipes/page.tsx` | Add CollectionBar above grid, pass smart collections |
| `src/components/recipes/RecipeCollection.tsx` | Accept active collection filter, pass filtered recipes |
| `src/components/recipes/RecipePage.tsx` | Add "Start Cooking" button and "Add to Collection" button |
| `package.json` | Add @anthropic-ai/sdk dependency |

---

## Task 1: Database Schema — Collections

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Collection model**

After the `RecipeTag` model in `prisma/schema.prisma`:

```prisma
model Collection {
  id          String             @id @default(cuid())
  userId      String
  name        String
  description String?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  user    User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipes RecipeCollection[]

  @@index([userId])
}

model RecipeCollection {
  recipeId     String
  collectionId String

  recipe     Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@id([recipeId, collectionId])
}

model SmartCollectionCache {
  id          String   @id @default(cuid())
  userId      String
  type        String
  recipeIds   String[]
  generatedAt DateTime @default(now())

  @@unique([userId, type])
  @@index([userId])
}
```

- [ ] **Step 2: Add relations to existing models**

Add to the `User` model:
```prisma
  collections Collection[]
```

Add to the `Recipe` model:
```prisma
  collections RecipeCollection[]
```

- [ ] **Step 3: Generate migration and Prisma client**

```bash
pnpm prisma migrate dev --name add-collections --create-only
pnpm prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Collection, RecipeCollection, and SmartCollectionCache schema"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types at the end of the file**

```typescript
export interface CollectionData {
  id: string;
  name: string;
  description: string | null;
  recipeCount: number;
  previewImages: string[]; // first 3 recipe hero images
}

export interface SmartCollectionData {
  id: string; // e.g., "quick-30", "rediscovery", "seasonal-spring"
  name: string;
  type: "rule" | "ai";
  recipeIds: string[];
  recipeCount: number;
  previewImages: string[];
}

export interface ScaledIngredient {
  text: string; // original text
  scaledText: string; // text with adjusted quantities
  quantity: number | null;
  scaledQuantity: number | null;
  unit: string | null;
  name: string | null;
  checked: boolean; // for cooking mode checklist
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Collection, SmartCollection, and ScaledIngredient types"
```

---

## Task 3: Ingredient Scaler

Scale parsed ingredient quantities by a multiplier for cooking mode. Uses the structured quantity/unit/name fields from Plan A.

**Files:**
- Create: `src/lib/ingredient-scaler.ts`
- Create: `src/lib/ingredient-scaler.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/ingredient-scaler.test.ts
import { describe, it, expect } from "vitest";
import { scaleIngredient, formatQuantity } from "./ingredient-scaler";

describe("formatQuantity", () => {
  it("formats whole numbers", () => {
    expect(formatQuantity(2)).toBe("2");
  });

  it("formats common fractions", () => {
    expect(formatQuantity(0.5)).toBe("1/2");
    expect(formatQuantity(0.25)).toBe("1/4");
    expect(formatQuantity(0.75)).toBe("3/4");
    expect(formatQuantity(1/3)).toBe("1/3");
  });

  it("formats mixed numbers", () => {
    expect(formatQuantity(1.5)).toBe("1 1/2");
    expect(formatQuantity(2.25)).toBe("2 1/4");
  });

  it("rounds awkward decimals", () => {
    expect(formatQuantity(1.333)).toBe("1 1/3");
    expect(formatQuantity(0.666)).toBe("2/3");
  });

  it("rounds to reasonable precision", () => {
    expect(formatQuantity(3.7)).toBe("3 3/4");
  });
});

describe("scaleIngredient", () => {
  it("scales a simple ingredient", () => {
    const result = scaleIngredient(
      { text: "2 cups flour", quantity: 2, unit: "cups", name: "flour" },
      2
    );
    expect(result.scaledText).toBe("4 cups flour");
    expect(result.scaledQuantity).toBe(4);
  });

  it("scales with fractions", () => {
    const result = scaleIngredient(
      { text: "1/2 cup sugar", quantity: 0.5, unit: "cup", name: "sugar" },
      2
    );
    expect(result.scaledText).toBe("1 cup sugar");
  });

  it("returns original text for unscalable ingredients", () => {
    const result = scaleIngredient(
      { text: "salt to taste", quantity: null, unit: null, name: "salt to taste" },
      2
    );
    expect(result.scaledText).toBe("salt to taste");
    expect(result.scaledQuantity).toBe(null);
  });

  it("handles scale factor of 1 (no change)", () => {
    const result = scaleIngredient(
      { text: "3 eggs", quantity: 3, unit: null, name: "eggs" },
      1
    );
    expect(result.scaledText).toBe("3 eggs");
  });

  it("scales count items", () => {
    const result = scaleIngredient(
      { text: "2 eggs", quantity: 2, unit: null, name: "eggs" },
      1.5
    );
    expect(result.scaledText).toBe("3 eggs");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/ingredient-scaler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ingredient scaler**

```typescript
// src/lib/ingredient-scaler.ts

interface IngredientInput {
  text: string;
  quantity: number | null;
  unit: string | null;
  name: string | null;
}

export interface ScaledResult {
  text: string;
  scaledText: string;
  quantity: number | null;
  scaledQuantity: number | null;
  unit: string | null;
  name: string | null;
}

const FRACTION_MAP: [number, string][] = [
  [1/8, "1/8"],
  [1/6, "1/6"],
  [1/4, "1/4"],
  [1/3, "1/3"],
  [3/8, "3/8"],
  [1/2, "1/2"],
  [5/8, "5/8"],
  [2/3, "2/3"],
  [3/4, "3/4"],
  [5/6, "5/6"],
  [7/8, "7/8"],
];

/**
 * Format a numeric quantity as a human-readable string with fractions.
 * E.g., 1.5 → "1 1/2", 0.333 → "1/3", 2.0 → "2"
 */
export function formatQuantity(value: number): string {
  if (value <= 0) return String(value);

  const whole = Math.floor(value);
  const frac = value - whole;

  // Pure whole number
  if (frac < 0.05) return String(whole);

  // Find closest fraction
  let bestFrac = "";
  let bestDiff = Infinity;
  for (const [fracValue, fracStr] of FRACTION_MAP) {
    const diff = Math.abs(frac - fracValue);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestFrac = fracStr;
    }
  }

  // If close enough to next whole number
  if (frac > 0.95) return String(whole + 1);

  if (whole > 0) return `${whole} ${bestFrac}`;
  return bestFrac;
}

/**
 * Scale an ingredient by a multiplier.
 * Returns the original text if the ingredient has no parseable quantity.
 */
export function scaleIngredient(
  ingredient: IngredientInput,
  factor: number
): ScaledResult {
  const base: ScaledResult = {
    text: ingredient.text,
    scaledText: ingredient.text,
    quantity: ingredient.quantity,
    scaledQuantity: ingredient.quantity,
    unit: ingredient.unit,
    name: ingredient.name,
  };

  if (ingredient.quantity === null || factor === 1) {
    return base;
  }

  const scaled = ingredient.quantity * factor;
  const formatted = formatQuantity(scaled);

  const parts = [formatted];
  if (ingredient.unit) parts.push(ingredient.unit);
  if (ingredient.name) parts.push(ingredient.name);

  return {
    ...base,
    scaledQuantity: scaled,
    scaledText: parts.join(" "),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/ingredient-scaler.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-scaler.ts src/lib/ingredient-scaler.test.ts
git commit -m "feat: add ingredient scaler with fraction formatting"
```

---

## Task 4: Smart Collections — Rule-Based Logic

Compute rule-based smart collections from the user's recipe data. Pure DB queries, no AI.

**Files:**
- Create: `src/lib/smart-collections.ts`
- Create: `src/lib/smart-collections.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/smart-collections.test.ts
import { describe, it, expect } from "vitest";
import { computeRuleBasedCollections } from "./smart-collections";

// Minimal recipe shape for testing
const makeRecipe = (overrides: Record<string, unknown> = {}) => ({
  id: "r1",
  title: "Test Recipe",
  images: ["https://example.com/img.jpg"],
  cookTime: 30,
  isFavorite: false,
  lastViewedAt: new Date(),
  _count: { ingredients: 8 },
  tags: [],
  ...overrides,
});

describe("computeRuleBasedCollections", () => {
  it("identifies quick weeknight dinners", () => {
    const recipes = [
      makeRecipe({ id: "r1", cookTime: 20, tags: [{ tag: { name: "Dinner", type: "MEAL_TYPE" } }] }),
      makeRecipe({ id: "r2", cookTime: 45, tags: [{ tag: { name: "Dinner", type: "MEAL_TYPE" } }] }),
      makeRecipe({ id: "r3", cookTime: 15, tags: [] }),
    ];
    const collections = computeRuleBasedCollections(recipes);
    const quick = collections.find((c) => c.id === "quick-30");
    expect(quick).toBeDefined();
    expect(quick!.recipeIds).toContain("r1");
    expect(quick!.recipeIds).not.toContain("r2");
  });

  it("identifies favorites", () => {
    const recipes = [
      makeRecipe({ id: "r1", isFavorite: true }),
      makeRecipe({ id: "r2", isFavorite: false }),
    ];
    const collections = computeRuleBasedCollections(recipes);
    const favs = collections.find((c) => c.id === "favorites");
    expect(favs).toBeDefined();
    expect(favs!.recipeIds).toEqual(["r1"]);
  });

  it("identifies recipes not viewed recently", () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const recipes = [
      makeRecipe({ id: "r1", lastViewedAt: thirtyOneDaysAgo }),
      makeRecipe({ id: "r2", lastViewedAt: null }),
      makeRecipe({ id: "r3", lastViewedAt: new Date() }),
    ];
    const collections = computeRuleBasedCollections(recipes);
    const rediscover = collections.find((c) => c.id === "rediscovery");
    expect(rediscover).toBeDefined();
    expect(rediscover!.recipeIds).toContain("r1");
    expect(rediscover!.recipeIds).toContain("r2");
    expect(rediscover!.recipeIds).not.toContain("r3");
  });

  it("omits empty collections", () => {
    const recipes = [makeRecipe({ isFavorite: false, cookTime: 60 })];
    const collections = computeRuleBasedCollections(recipes);
    const favs = collections.find((c) => c.id === "favorites");
    expect(favs).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/smart-collections.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement smart-collections.ts**

```typescript
// src/lib/smart-collections.ts
import type { SmartCollectionData } from "@/types";

interface RecipeForCollections {
  id: string;
  title: string;
  images: string[];
  cookTime: number | null;
  isFavorite: boolean;
  lastViewedAt: Date | null;
  _count: { ingredients: number };
  tags: { tag: { name: string; type: string } }[];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Compute rule-based smart collections from a user's recipe list.
 * Returns only non-empty collections.
 */
export function computeRuleBasedCollections(
  recipes: RecipeForCollections[]
): SmartCollectionData[] {
  const results: SmartCollectionData[] = [];

  // Favorites
  const favorites = recipes.filter((r) => r.isFavorite);
  if (favorites.length > 0) {
    results.push(makeCollection("favorites", "Favorites", "rule", favorites));
  }

  // Quick meals (under 30 min)
  const quick = recipes.filter((r) => r.cookTime !== null && r.cookTime <= 30);
  if (quick.length > 0) {
    results.push(makeCollection("quick-30", "Under 30 Minutes", "rule", quick));
  }

  // 5 ingredients or fewer
  const fewIngredients = recipes.filter((r) => r._count.ingredients <= 5 && r._count.ingredients > 0);
  if (fewIngredients.length > 0) {
    results.push(makeCollection("few-ingredients", "5 Ingredients or Fewer", "rule", fewIngredients));
  }

  // Rediscovery (not viewed in 30+ days, or never viewed)
  const now = Date.now();
  const rediscover = recipes.filter((r) => {
    if (!r.lastViewedAt) return true;
    return now - r.lastViewedAt.getTime() > THIRTY_DAYS_MS;
  });
  if (rediscover.length > 0) {
    results.push(makeCollection("rediscovery", "Haven't Made in a While", "rule", rediscover));
  }

  return results;
}

function makeCollection(
  id: string,
  name: string,
  type: "rule" | "ai",
  recipes: RecipeForCollections[]
): SmartCollectionData {
  return {
    id,
    name,
    type,
    recipeIds: recipes.map((r) => r.id),
    recipeCount: recipes.length,
    previewImages: recipes.slice(0, 3).map((r) => r.images[0]).filter(Boolean),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/smart-collections.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/smart-collections.ts src/lib/smart-collections.test.ts
git commit -m "feat: add rule-based smart collections computation"
```

---

## Task 5: AI-Curated Collections

Seasonal and featured collections via Anthropic API, cached per user per day.

**Files:**
- Create: `src/lib/ai-collections.ts`
- Modify: `package.json` (add @anthropic-ai/sdk)

- [ ] **Step 1: Install Anthropic SDK**

```bash
pnpm add @anthropic-ai/sdk
```

- [ ] **Step 2: Create ai-collections.ts**

```typescript
// src/lib/ai-collections.ts
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import type { SmartCollectionData } from "@/types";

let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

interface RecipeSummary {
  id: string;
  title: string;
  images: string[];
  tags: string[];
  ingredients: string[];
}

/**
 * Get AI-curated collections for a user, using cache when available.
 * Returns empty array if API key is not configured or API fails.
 */
export async function getAiCuratedCollections(
  userId: string,
  recipes: RecipeSummary[]
): Promise<SmartCollectionData[]> {
  if (!process.env.ANTHROPIC_API_KEY || recipes.length < 3) {
    return [];
  }

  // Check cache
  const cached = await prisma.smartCollectionCache.findMany({
    where: { userId },
  });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const validCache = cached.filter((c) => c.generatedAt > oneDayAgo);
  if (validCache.length > 0) {
    return validCache.map((c) => ({
      id: `ai-${c.type}`,
      name: c.type === "seasonal" ? getSeasonalName() : "Featured",
      type: "ai" as const,
      recipeIds: c.recipeIds,
      recipeCount: c.recipeIds.length,
      previewImages: getPreviewImages(c.recipeIds, recipes),
    }));
  }

  // Generate fresh
  try {
    const result = await generateAiCollections(recipes);

    // Cache results
    for (const collection of result) {
      await prisma.smartCollectionCache.upsert({
        where: { userId_type: { userId, type: collection.cacheType } },
        create: {
          userId,
          type: collection.cacheType,
          recipeIds: collection.recipeIds,
        },
        update: {
          recipeIds: collection.recipeIds,
          generatedAt: now,
        },
      });
    }

    return result.map((c) => ({
      id: `ai-${c.cacheType}`,
      name: c.name,
      type: "ai" as const,
      recipeIds: c.recipeIds,
      recipeCount: c.recipeIds.length,
      previewImages: getPreviewImages(c.recipeIds, recipes),
    }));
  } catch (error) {
    console.error("AI collections generation failed:", error);
    return [];
  }
}

interface AiCollectionResult {
  cacheType: string;
  name: string;
  recipeIds: string[];
}

async function generateAiCollections(
  recipes: RecipeSummary[]
): Promise<AiCollectionResult[]> {
  const recipeList = recipes
    .map((r) => `- ID: ${r.id} | "${r.title}" | Tags: ${r.tags.join(", ")} | Key ingredients: ${r.ingredients.slice(0, 5).join(", ")}`)
    .join("\n");

  const season = getCurrentSeason();

  const message = await getAnthropicClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are curating a personal recipe collection. Given these recipes, suggest:

1. A "${season}" seasonal collection (3-8 recipes that fit the current season)
2. A single "Featured" recipe pick (the most interesting/appealing one for right now)

Recipes:
${recipeList}

Respond in JSON only:
{
  "seasonal": { "name": "Spring Vegetables", "recipeIds": ["id1", "id2"] },
  "featured": { "recipeId": "id1" }
}

Use exact recipe IDs from the list. Only include recipes that genuinely fit. If no recipes fit a category, use an empty array.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  const results: AiCollectionResult[] = [];

  const validIds = new Set(recipes.map((r) => r.id));

  if (parsed.seasonal?.recipeIds?.length > 0) {
    const ids = parsed.seasonal.recipeIds.filter((id: string) => validIds.has(id));
    if (ids.length > 0) {
      results.push({
        cacheType: "seasonal",
        name: parsed.seasonal.name || getSeasonalName(),
        recipeIds: ids,
      });
    }
  }

  if (parsed.featured?.recipeId && validIds.has(parsed.featured.recipeId)) {
    results.push({
      cacheType: "featured",
      name: "Featured",
      recipeIds: [parsed.featured.recipeId],
    });
  }

  return results;
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

function getSeasonalName(): string {
  return `${getCurrentSeason()} Picks`;
}

function getPreviewImages(recipeIds: string[], recipes: RecipeSummary[]): string[] {
  return recipeIds
    .slice(0, 3)
    .map((id) => recipes.find((r) => r.id === id)?.images[0])
    .filter(Boolean) as string[];
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai-collections.ts package.json pnpm-lock.yaml
git commit -m "feat: add AI-curated seasonal and featured collections via Anthropic"
```

---

## Task 6: Collection CRUD API Routes

**Files:**
- Create: `src/app/api/collections/route.ts`
- Create: `src/app/api/collections/[id]/route.ts`
- Create: `src/app/api/collections/[id]/recipes/route.ts`

- [ ] **Step 1: Create GET/POST collections route**

```typescript
// src/app/api/collections/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { CollectionData } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      recipes: {
        include: {
          recipe: { select: { images: true } },
        },
        take: 3,
      },
      _count: { select: { recipes: true } },
    },
  });

  const result: CollectionData[] = collections.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    recipeCount: c._count.recipes,
    previewImages: c.recipes.map((rc) => rc.recipe.images[0]).filter(Boolean),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const collection = await prisma.collection.create({
    data: { userId: user.id, name: name.trim(), description: description?.trim() || null },
  });

  return NextResponse.json(collection, { status: 201 });
}
```

- [ ] **Step 2: Create PUT/DELETE single collection route**

```typescript
// src/app/api/collections/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: { recipes: { select: { recipeId: true } } },
  });
  if (!collection || collection.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...collection,
    recipeIds: collection.recipes.map((r) => r.recipeId),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await prisma.collection.findUnique({ where: { id }, select: { userId: true } });
  if (!collection || collection.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name, description } = await request.json();
  const updated = await prisma.collection.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await prisma.collection.findUnique({ where: { id }, select: { userId: true } });
  if (!collection || collection.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.collection.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Create add/remove recipe from collection route**

```typescript
// src/app/api/collections/[id]/recipes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { userId: true },
  });
  if (!collection || collection.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { recipeId } = await request.json();
  if (!recipeId) return NextResponse.json({ error: "recipeId required" }, { status: 400 });

  await prisma.recipeCollection.upsert({
    where: { recipeId_collectionId: { recipeId, collectionId } },
    create: { recipeId, collectionId },
    update: {},
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipeId } = await request.json();

  await prisma.recipeCollection.deleteMany({
    where: { recipeId, collectionId },
  });

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/collections/
git commit -m "feat: add collection CRUD and recipe membership API routes"
```

---

## Task 7: Smart Collections API Route

**Files:**
- Create: `src/app/api/smart-collections/route.ts`

- [ ] **Step 1: Create smart collections endpoint**

```typescript
// src/app/api/smart-collections/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeRuleBasedCollections } from "@/lib/smart-collections";
import { getAiCuratedCollections } from "@/lib/ai-collections";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      images: true,
      cookTime: true,
      isFavorite: true,
      lastViewedAt: true,
      _count: { select: { ingredients: true } },
      tags: { include: { tag: true } },
      ingredients: { select: { text: true }, take: 10 },
    },
  });

  // Rule-based collections
  const ruleBased = computeRuleBasedCollections(recipes);

  // AI-curated collections
  const aiRecipes = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    images: r.images,
    tags: r.tags.map((rt) => rt.tag.name),
    ingredients: r.ingredients.map((i) => i.text),
  }));
  const aiCurated = await getAiCuratedCollections(user.id, aiRecipes);

  return NextResponse.json([...aiCurated, ...ruleBased]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/smart-collections/route.ts
git commit -m "feat: add smart collections API combining rule-based and AI curation"
```

---

## Task 8: CollectionBar UI Component

Horizontal scrollable strip showing collections above the recipe grid.

**Files:**
- Create: `src/components/recipes/CollectionBar.tsx`
- Create: `src/components/recipes/CreateCollectionModal.tsx`
- Create: `src/components/recipes/AddToCollectionButton.tsx`

- [ ] **Step 1: Create CollectionBar**

```tsx
// src/components/recipes/CollectionBar.tsx
"use client";

import { useState, useEffect } from "react";
import CreateCollectionModal from "./CreateCollectionModal";
import type { CollectionData, SmartCollectionData } from "@/types";

interface CollectionBarProps {
  onFilter: (recipeIds: string[] | null, label: string | null) => void;
  activeFilter: string | null;
}

export default function CollectionBar({ onFilter, activeFilter }: CollectionBarProps) {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [smartCollections, setSmartCollections] = useState<SmartCollectionData[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/collections").then((r) => r.json()).then(setCollections).catch(() => {});
    fetch("/api/smart-collections").then((r) => r.json()).then(setSmartCollections).catch(() => {});
  }, []);

  async function handleClick(id: string, recipeIds: string[] | null, name: string) {
    if (activeFilter === id) {
      onFilter(null, null);
      return;
    }

    // For user collections, fetch recipe IDs from API
    if (!recipeIds) {
      try {
        const res = await fetch(`/api/collections/${id}`);
        if (res.ok) {
          const data = await res.json();
          onFilter(data.recipeIds ?? [], id);
        }
      } catch { /* ignore */ }
      return;
    }

    onFilter(recipeIds, id);
  }

  const allCollections = [
    ...smartCollections.map((sc) => ({
      id: sc.id,
      name: sc.name,
      previewImages: sc.previewImages,
      recipeIds: sc.recipeIds as string[] | null,
      type: sc.type,
    })),
    ...collections.map((c) => ({
      id: c.id,
      name: c.name,
      previewImages: c.previewImages,
      recipeIds: null as string[] | null, // fetched on click
      type: "user" as const,
    })),
  ];

  if (allCollections.length === 0 && !showCreate) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {allCollections.map((col) => (
          <button
            key={col.id}
            onClick={() => handleClick(col.id, col.recipeIds, col.name)}
            className={`shrink-0 flex flex-col items-center gap-1.5 p-2 transition-colors ${
              activeFilter === col.id ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
          >
            {/* Preview images */}
            <div className="flex gap-0.5">
              {col.previewImages.slice(0, 3).map((img, i) => (
                <div key={i} className="w-10 h-10 overflow-hidden bg-gray-50">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {col.previewImages.length === 0 && (
                <div className="w-10 h-10 bg-gray-100" />
              )}
            </div>
            <span className={`font-sans text-xs font-semibold uppercase tracking-wider ${
              activeFilter === col.id ? "text-black" : "text-gray-500"
            }`}>
              {col.name}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 flex flex-col items-center gap-1.5 p-2 opacity-50 hover:opacity-100 transition-opacity"
        >
          <div className="w-10 h-10 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg">
            +
          </div>
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">
            New
          </span>
        </button>
      </div>

      {activeFilter && (
        <button
          onClick={() => onFilter(null, null)}
          className="font-sans text-xs text-gray-500 hover:text-black mt-2 transition-colors"
        >
          Clear filter &times;
        </button>
      )}

      {showCreate && (
        <CreateCollectionModal
          onClose={() => setShowCreate(false)}
          onCreated={(newCol) => {
            setCollections([newCol, ...collections]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CreateCollectionModal**

```tsx
// src/components/recipes/CreateCollectionModal.tsx
"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { CollectionData } from "@/types";

interface Props {
  onClose: () => void;
  onCreated: (collection: CollectionData) => void;
}

export default function CreateCollectionModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated({ id: data.id, name: data.name, description: null, recipeCount: 0, previewImages: [] });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white p-6 w-[90vw] max-w-[400px] rounded-[8px] animate-slideUp">
        <h2 className="font-display text-xl font-bold mb-4">New Collection</h2>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Thanksgiving, Date Night"
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <Button onClick={handleCreate} loading={saving} className="flex-1">
            Create
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create AddToCollectionButton**

```tsx
// src/components/recipes/AddToCollectionButton.tsx
"use client";

import { useState, useEffect } from "react";
import type { CollectionData } from "@/types";

interface Props {
  recipeId: string;
}

export default function AddToCollectionButton({ recipeId }: Props) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionData[]>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/collections").then((r) => r.json()).then(setCollections);
    }
  }, [open]);

  async function addToCollection(collectionId: string) {
    await fetch(`/api/collections/${collectionId}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId }),
    });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="font-sans text-xs font-semibold text-gray-500 hover:text-black transition-colors"
      >
        + Collection
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 shadow-sm py-1 min-w-[160px] z-30">
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => addToCollection(c.id)}
              className="block w-full text-left px-3 py-1.5 font-sans text-xs text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
            >
              {c.name}
            </button>
          ))}
          {collections.length === 0 && (
            <p className="px-3 py-1.5 font-sans text-xs text-gray-400">No collections yet</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/recipes/CollectionBar.tsx src/components/recipes/CreateCollectionModal.tsx src/components/recipes/AddToCollectionButton.tsx
git commit -m "feat: add CollectionBar, CreateCollectionModal, and AddToCollectionButton components"
```

---

## Task 9: Integrate Collections into Recipes Page

**Files:**
- Modify: `src/components/recipes/RecipeCollection.tsx`
- Modify: `src/app/recipes/page.tsx`
- Modify: `src/components/recipes/RecipePage.tsx`

- [ ] **Step 1: Update RecipeCollection to support filtering**

```tsx
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
```

- [ ] **Step 2: Add AddToCollectionButton to RecipePage**

In `src/components/recipes/RecipePage.tsx`, import `AddToCollectionButton` and add it in the tags row, next to the "View Original" link:

```tsx
import AddToCollectionButton from "./AddToCollectionButton";

// In the tags row div, add before the closing </div>:
<AddToCollectionButton recipeId={recipe.id} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes/RecipeCollection.tsx src/components/recipes/RecipePage.tsx
git commit -m "feat: integrate collections into recipes page with filtering and add-to-collection"
```

---

## Task 10: Wake Lock Hook

**Files:**
- Create: `src/hooks/useWakeLock.ts`

- [ ] **Step 1: Create wake lock hook**

```typescript
// src/hooks/useWakeLock.ts
"use client";

import { useState, useEffect, useCallback } from "react";

export function useWakeLock() {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await navigator.wakeLock.request("screen");
        setWakeLock(lock);
        setIsActive(true);

        lock.addEventListener("release", () => {
          setIsActive(false);
          setWakeLock(null);
        });
      }
    } catch {
      // Wake lock request failed (e.g., low battery, tab not visible)
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setIsActive(false);
    }
  }, [wakeLock]);

  // Re-acquire on visibility change (wake lock releases when tab goes background)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && isActive) {
        request();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isActive, request]);

  return { isActive, request, release };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWakeLock.ts
git commit -m "feat: add useWakeLock hook for Screen Wake Lock API"
```

---

## Task 11: Timer Hook

**Files:**
- Create: `src/hooks/useTimer.ts`

- [ ] **Step 1: Create timer hook**

```typescript
// src/hooks/useTimer.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TimerState {
  seconds: number;
  isRunning: boolean;
  isDone: boolean;
}

export function useTimer(totalSeconds: number) {
  const [state, setState] = useState<TimerState>({
    seconds: totalSeconds,
    isRunning: false,
    isDone: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setState((s) => ({ ...s, isRunning: true, isDone: false }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    setState({ seconds: totalSeconds, isRunning: false, isDone: false });
  }, [totalSeconds]);

  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState((s) => {
          if (s.seconds <= 1) {
            return { seconds: 0, isRunning: false, isDone: true };
          }
          return { ...s, seconds: s.seconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning]);

  // Play sound when done
  useEffect(() => {
    if (state.isDone) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        // Audio not available
      }
    }
  }, [state.isDone]);

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, []);

  return { ...state, formatted: formatTime(state.seconds), start, pause, reset };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTimer.ts
git commit -m "feat: add useTimer hook with countdown and audio alert"
```

---

## Task 12: Cooking Mode Components

The main cooking mode UI — full-screen step-by-step with scaling, timers, and ingredient drawer.

**Files:**
- Create: `src/components/cooking/CookingStep.tsx`
- Create: `src/components/cooking/CookingTimer.tsx`
- Create: `src/components/cooking/IngredientDrawer.tsx`
- Create: `src/components/cooking/CookingMode.tsx`

- [ ] **Step 1: Create CookingStep**

```tsx
// src/components/cooking/CookingStep.tsx
"use client";

import CookingTimer from "./CookingTimer";

interface CookingStepProps {
  stepNumber: number;
  totalSteps: number;
  text: string;
}

// Extract time references from step text (e.g., "cook 15 minutes" → 15*60)
function extractTimerSeconds(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:minute|min)/i);
  if (match) return parseInt(match[1], 10) * 60;
  const hourMatch = text.match(/(\d+)\s*(?:hour|hr)/i);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 3600;
  return null;
}

export default function CookingStep({ stepNumber, totalSteps, text }: CookingStepProps) {
  const timerSeconds = extractTimerSeconds(text);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-8">
        Step {stepNumber} of {totalSteps}
      </div>

      <p className="font-serif text-xl md:text-2xl leading-relaxed text-white max-w-[600px]">
        {text}
      </p>

      {timerSeconds && (
        <div className="mt-8">
          <CookingTimer totalSeconds={timerSeconds} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CookingTimer**

```tsx
// src/components/cooking/CookingTimer.tsx
"use client";

import { useTimer } from "@/hooks/useTimer";

interface CookingTimerProps {
  totalSeconds: number;
}

export default function CookingTimer({ totalSeconds }: CookingTimerProps) {
  const { formatted, isRunning, isDone, start, pause, reset } = useTimer(totalSeconds);

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${
      isDone ? "bg-red text-white" : "bg-white/10 text-white"
    }`}>
      <span className="font-sans text-lg font-bold tabular-nums">
        {isDone ? "Done!" : formatted}
      </span>
      {!isDone && (
        <button
          onClick={isRunning ? pause : start}
          className="font-sans text-xs font-semibold uppercase tracking-wider hover:text-white/80 transition-colors"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
      )}
      {(isRunning || isDone) && (
        <button
          onClick={reset}
          className="font-sans text-xs text-white/50 hover:text-white transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create IngredientDrawer**

```tsx
// src/components/cooking/IngredientDrawer.tsx
"use client";

import { useState } from "react";
import type { ScaledIngredient } from "@/types";

interface IngredientDrawerProps {
  ingredients: ScaledIngredient[];
  onToggle: (index: number) => void;
  scaleFactor: number;
  originalServings: number | null;
  onScaleChange: (factor: number) => void;
}

export default function IngredientDrawer({
  ingredients,
  onToggle,
  scaleFactor,
  originalServings,
  onScaleChange,
}: IngredientDrawerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Handle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gray-900 border-t border-white/10 py-2 flex items-center justify-center"
      >
        <div className="w-10 h-1 bg-white/30 rounded-full" />
      </button>

      {/* Drawer content */}
      {expanded && (
        <div className="bg-gray-900 border-t border-white/10 max-h-[50vh] overflow-y-auto px-6 py-4">
          {/* Scale controls */}
          {originalServings && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-white/50">
                Servings
              </span>
              <button
                onClick={() => onScaleChange(Math.max(0.5, scaleFactor - 0.5))}
                className="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
              >
                −
              </button>
              <span className="font-sans text-base font-bold text-white tabular-nums min-w-[2rem] text-center">
                {Math.round(originalServings * scaleFactor)}
              </span>
              <button
                onClick={() => onScaleChange(scaleFactor + 0.5)}
                className="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
              >
                +
              </button>
              {scaleFactor !== 1 && (
                <button
                  onClick={() => onScaleChange(1)}
                  className="font-sans text-xs text-white/40 hover:text-white ml-2 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Ingredients list */}
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li
                key={i}
                onClick={() => onToggle(i)}
                className={`font-serif text-base cursor-pointer transition-colors ${
                  ing.checked ? "text-white/30 line-through" : "text-white"
                }`}
              >
                {ing.scaledText}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create CookingMode**

```tsx
// src/components/cooking/CookingMode.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import CookingStep from "./CookingStep";
import IngredientDrawer from "./IngredientDrawer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { scaleIngredient } from "@/lib/ingredient-scaler";
import type { RecipeDetail, ScaledIngredient } from "@/types";

interface CookingModeProps {
  recipe: RecipeDetail;
  onExit: () => void;
}

export default function CookingMode({ recipe, onExit }: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const wakeLock = useWakeLock();

  // Request wake lock on mount
  useEffect(() => {
    wakeLock.request();
    return () => { wakeLock.release(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setCurrentStep((s) => Math.min(s + 1, recipe.instructions.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentStep((s) => Math.max(s - 1, 0));
      } else if (e.key === "Escape") {
        onExit();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [recipe.instructions.length, onExit]);

  // Scaled ingredients
  const scaledIngredients: ScaledIngredient[] = useMemo(() => {
    return recipe.ingredients.map((ing, i) => {
      const scaled = scaleIngredient(
        { text: ing.text, quantity: ing.quantity, unit: ing.unit, name: ing.name },
        scaleFactor
      );
      return {
        ...scaled,
        checked: checkedIngredients.has(i),
      };
    });
  }, [recipe.ingredients, scaleFactor, checkedIngredients]);

  const toggleIngredient = useCallback((index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, recipe.instructions.length - 1));

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h1 className="font-display text-base font-bold text-white truncate max-w-[60%]">
          {recipe.title}
        </h1>
        <button
          onClick={onExit}
          className="font-sans text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
        >
          Exit
        </button>
      </div>

      {/* Step content — large tap zones */}
      <div className="flex-1 relative">
        <CookingStep
          stepNumber={currentStep + 1}
          totalSteps={recipe.instructions.length}
          text={recipe.instructions[currentStep].text}
        />

        {/* Left tap zone */}
        {currentStep > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-0 top-0 bottom-0 w-1/3"
            aria-label="Previous step"
          />
        )}

        {/* Right tap zone */}
        {currentStep < recipe.instructions.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-0 top-0 bottom-0 w-1/3"
            aria-label="Next step"
          />
        )}

        {/* Visible nav arrows */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between px-6">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="font-sans text-sm text-white/40 disabled:invisible hover:text-white transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={goNext}
            disabled={currentStep === recipe.instructions.length - 1}
            className="font-sans text-sm text-white/40 disabled:invisible hover:text-white transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Ingredient drawer */}
      <IngredientDrawer
        ingredients={scaledIngredients}
        onToggle={toggleIngredient}
        scaleFactor={scaleFactor}
        originalServings={recipe.servings}
        onScaleChange={setScaleFactor}
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/cooking/
git commit -m "feat: add cooking mode with step-by-step view, timers, scaling, and ingredient drawer"
```

---

## Task 13: Voice Control Component (Guided Mode)

**Files:**
- Create: `src/components/cooking/VoiceControl.tsx`

- [ ] **Step 1: Create VoiceControl component**

```tsx
// src/components/cooking/VoiceControl.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface VoiceControlProps {
  onCommand: (command: "next" | "previous" | "repeat" | "ingredients") => void;
  enabled: boolean;
}

export default function VoiceControl({ onCommand, enabled }: VoiceControlProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand; // always latest, avoids re-creating recognition

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();

      if (transcript.includes("next")) onCommandRef.current("next");
      else if (transcript.includes("previous") || transcript.includes("back")) onCommandRef.current("previous");
      else if (transcript.includes("repeat") || transcript.includes("again")) onCommandRef.current("repeat");
      else if (transcript.includes("ingredient")) onCommandRef.current("ingredients");
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (recognitionRef.current) {
        try { recognition.start(); } catch { setListening(false); }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []); // uses onCommandRef, no dependency on onCommand prop

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (enabled && supported) startListening();
    else stopListening();
    return stopListening;
  }, [enabled, supported, startListening, stopListening]);

  if (!supported) return null;

  return (
    <div className={`flex items-center gap-2 ${listening ? "text-red" : "text-white/40"}`}>
      <div className={`w-2 h-2 rounded-full ${listening ? "bg-red animate-pulse" : "bg-white/30"}`} />
      <span className="font-sans text-xs font-semibold uppercase tracking-wider">
        {listening ? "Listening" : "Voice off"}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Integrate VoiceControl into CookingMode**

In `src/components/cooking/CookingMode.tsx`, add voice control support:

1. Import VoiceControl
2. Add `guidedMode` state: `const [guidedMode, setGuidedMode] = useState(false);`
3. Add a voice command handler:
```typescript
const handleVoiceCommand = useCallback((command: "next" | "previous" | "repeat" | "ingredients") => {
  if (command === "next") goNext();
  else if (command === "previous") goPrev();
  else if (command === "repeat") {
    // Read current step aloud
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(recipe.instructions[currentStep].text);
      window.speechSynthesis.speak(utterance);
    }
  }
}, [currentStep, recipe.instructions]);
```
4. Add guided mode toggle in the top bar, next to the Exit button
5. Render `<VoiceControl enabled={guidedMode} onCommand={handleVoiceCommand} />` in the top bar when `guidedMode` is true

- [ ] **Step 3: Commit**

```bash
git add src/components/cooking/VoiceControl.tsx src/components/cooking/CookingMode.tsx
git commit -m "feat: add voice control and guided mode to cooking mode"
```

---

## Task 14: Integrate Cooking Mode into RecipePage

**Files:**
- Modify: `src/components/recipes/RecipePage.tsx`

- [ ] **Step 1: Add "Start Cooking" button and cooking mode integration**

In `src/components/recipes/RecipePage.tsx`:

1. Import CookingMode:
```tsx
import CookingMode from "@/components/cooking/CookingMode";
```

2. Add state for cooking mode:
```tsx
const [cooking, setCooking] = useState(false);
```

3. Add the `useState` import (already imported from React in the file).

4. If `cooking` is true, render `<CookingMode recipe={recipe} onExit={() => setCooking(false)} />` instead of the normal recipe view.

5. Add a "Start Cooking" button in the tags row area:
```tsx
<button
  onClick={() => setCooking(true)}
  className="bg-black text-white font-sans text-xs font-semibold uppercase tracking-wider px-4 py-1.5 hover:bg-gray-900 transition-colors"
>
  Start Cooking
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recipes/RecipePage.tsx
git commit -m "feat: integrate cooking mode into RecipePage with Start Cooking button"
```

---

## Task 15: Final Build Verification

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (ingredient parser: 10, scraper notes: 4, ingredient scaler: 10, smart collections: 4).

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from Plan B implementation"
```

---

## Deferred Items (Not in This Plan)

- **Speech Synthesis for step read-aloud** — the VoiceControl component handles recognition; read-aloud on step navigation is a polish item
- **Touch swipe between steps** — cooking mode uses tap zones; swipe gestures are deferred
- **Collection reordering/editing inline** — collections can be created and have recipes added; reordering is deferred
- **Featured recipe hero treatment** — the AI returns a featured recipe but the UI treats it the same as other collections; a magazine-cover style hero is deferred to polish

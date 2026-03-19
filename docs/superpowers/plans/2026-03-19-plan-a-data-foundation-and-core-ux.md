# Plan A: Data Foundation & Core UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rich recipe extraction (substitutions, storage tips, servings), redesign the booklet view to be image-forward, and add personal stories & favorites.

**Architecture:** Extends the existing Prisma schema with new fields on Recipe/Ingredient and new Substitution model. Expands the Cheerio scraper to extract supplementary content from food blogs. Builds new client components for the image-forward booklet view, inline story editing, and favorites. Adds a PUT endpoint for recipe updates.

**Tech Stack:** Next.js 16, TypeScript, Prisma 6, Cheerio, Supabase Auth, Tailwind v4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-additional-features-design.md`

---

## File Structure

### New files:

| File | Responsibility |
|------|---------------|
| `vitest.config.ts` | Vitest configuration |
| `src/lib/ingredient-parser.ts` | Parse ingredient strings into quantity/unit/name |
| `src/lib/ingredient-parser.test.ts` | Tests for ingredient parser |
| `src/lib/scraper-notes.ts` | Extract supplementary content (substitutions, tips) from HTML |
| `src/lib/scraper-notes.test.ts` | Tests for notes extraction |
| `src/components/recipes/RecipeBooklet.tsx` | Booklet overlay wrapper with prev/next navigation |
| `src/components/recipes/RecipePage.tsx` | Full image-forward booklet page layout |
| `src/components/recipes/ImageCarousel.tsx` | Hero image carousel with dots |
| `src/components/recipes/PersonalNotes.tsx` | Inline-editable personal story/adaptations |
| `src/components/recipes/FavoriteButton.tsx` | Heart toggle for favorites |

### Modified files:

| File | Changes |
|------|---------|
| `package.json` | Add vitest, @testing-library/react, jsdom devDependencies |
| `prisma/schema.prisma` | Add new fields to Recipe/Ingredient, add Substitution model |
| `src/types/index.ts` | Add new fields to all interfaces, add SubstitutionData type |
| `src/lib/scraper.ts` | Add `recipeYield` to SchemaRecipe, export helpers, pass notes to extraction |
| `src/app/api/extract/route.ts` | Return new supplementary fields |
| `src/app/api/recipes/route.ts` | Handle new fields in POST, add isFavorite to GET |
| `src/app/api/recipes/[id]/route.ts` | Add PUT handler, return new fields in GET, update lastViewedAt |
| `src/components/recipes/ImportForm.tsx` | Add servings, substitutions, tips inputs |
| `src/components/recipes/RecipeCard.tsx` | Add FavoriteButton |
| `src/app/recipes/page.tsx` | Integrate RecipeBooklet, pass full data |
| `src/app/recipes/[id]/page.tsx` | Update with new fields, image-forward layout |

---

## Task 1: Set Up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest and dependencies**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (should show 0 tests)**

Run: `pnpm test`
Expected: "No test files found" or similar — confirms setup works.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore: set up Vitest testing framework"
```

---

## Task 2: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new fields to Recipe model**

In `prisma/schema.prisma`, add these fields to the `Recipe` model after `updatedAt`:

```prisma
  servings            Int?
  storageTips         String?
  makeAheadNotes      String?
  servingSuggestions   String?
  techniqueNotes      String?
  personalNotes       String?
  personalAdaptations String?
  isFavorite          Boolean   @default(false)
  lastViewedAt        DateTime?
```

Also add the `substitutions` relation:
```prisma
  substitutions Substitution[]
```

- [ ] **Step 2: Add structured fields to Ingredient model**

Add after the `order` field:

```prisma
  quantity Float?
  unit     String?
  name     String?
```

- [ ] **Step 3: Add Substitution model**

Add after the `Instruction` model:

```prisma
model Substitution {
  id         String  @id @default(cuid())
  recipeId   String
  ingredient String
  substitute String
  notes      String?
  order      Int

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([recipeId])
}
```

- [ ] **Step 4: Generate and run migration**

```bash
pnpm prisma migrate dev --name add-rich-recipe-fields
```

Expected: Migration created and applied successfully.

- [ ] **Step 5: Verify Prisma client regenerated**

```bash
pnpm prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add schema for rich extraction, personal notes, and favorites"
```

---

## Task 3: Ingredient Parser

A utility to parse ingredient strings like `"1 1/2 cups all-purpose flour"` into structured `{ quantity, unit, name }`. This enables recipe scaling in Cooking Mode (Plan B) and is populated during extraction.

**Files:**
- Create: `src/lib/ingredient-parser.ts`
- Create: `src/lib/ingredient-parser.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/ingredient-parser.test.ts
import { describe, it, expect } from "vitest";
import { parseIngredient } from "./ingredient-parser";

describe("parseIngredient", () => {
  it("parses simple quantity + unit + name", () => {
    expect(parseIngredient("2 cups flour")).toEqual({
      quantity: 2,
      unit: "cups",
      name: "flour",
    });
  });

  it("parses fractions", () => {
    expect(parseIngredient("1/2 cup sugar")).toEqual({
      quantity: 0.5,
      unit: "cup",
      name: "sugar",
    });
  });

  it("parses mixed numbers", () => {
    expect(parseIngredient("1 1/2 cups all-purpose flour")).toEqual({
      quantity: 1.5,
      unit: "cups",
      name: "all-purpose flour",
    });
  });

  it("parses count items without unit", () => {
    expect(parseIngredient("3 eggs")).toEqual({
      quantity: 3,
      unit: null,
      name: "eggs",
    });
  });

  it("parses tablespoons and teaspoons", () => {
    expect(parseIngredient("2 tbsp olive oil")).toEqual({
      quantity: 2,
      unit: "tbsp",
      name: "olive oil",
    });
  });

  it("returns nulls for unparseable ingredients", () => {
    expect(parseIngredient("salt and pepper to taste")).toEqual({
      quantity: null,
      unit: null,
      name: "salt and pepper to taste",
    });
  });

  it("handles 'a pinch of' style", () => {
    expect(parseIngredient("a pinch of salt")).toEqual({
      quantity: null,
      unit: null,
      name: "a pinch of salt",
    });
  });

  it("parses decimal quantities", () => {
    expect(parseIngredient("0.5 oz cream cheese")).toEqual({
      quantity: 0.5,
      unit: "oz",
      name: "cream cheese",
    });
  });

  it("handles unicode fractions", () => {
    expect(parseIngredient("½ cup milk")).toEqual({
      quantity: 0.5,
      unit: "cup",
      name: "milk",
    });
  });

  it("parses quantity with descriptor before name", () => {
    expect(parseIngredient("4 cloves garlic, minced")).toEqual({
      quantity: 4,
      unit: null,
      name: "cloves garlic, minced",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/ingredient-parser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ingredient parser**

```typescript
// src/lib/ingredient-parser.ts

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1/3, "⅔": 2/3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1/6, "⅚": 5/6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

const UNITS = new Set([
  "cup", "cups", "c",
  "tablespoon", "tablespoons", "tbsp", "tbs", "T",
  "teaspoon", "teaspoons", "tsp", "t",
  "ounce", "ounces", "oz",
  "pound", "pounds", "lb", "lbs",
  "gram", "grams", "g",
  "kilogram", "kilograms", "kg",
  "milliliter", "milliliters", "ml",
  "liter", "liters", "l",
  "gallon", "gallons", "gal",
  "quart", "quarts", "qt",
  "pint", "pints", "pt",
  "stick", "sticks",
  "can", "cans",
  "package", "packages", "pkg",
  "bunch", "bunches",
  "head", "heads",
  "slice", "slices",
  "piece", "pieces",
  "sprig", "sprigs",
  "dash", "dashes",
]);

/**
 * Parse an ingredient string into structured quantity/unit/name.
 * Returns { quantity: null, unit: null, name: originalText } for unparseable inputs.
 */
export function parseIngredient(text: string): ParsedIngredient {
  let remaining = text.trim();

  // Try to extract a leading quantity
  const quantityResult = extractQuantity(remaining);
  if (quantityResult === null) {
    return { quantity: null, unit: null, name: remaining };
  }

  const { quantity, rest } = quantityResult;
  remaining = rest.trim();

  // Try to extract a unit
  const firstWord = remaining.split(/\s+/)[0]?.replace(/[.,]$/, "");
  if (firstWord && UNITS.has(firstWord.toLowerCase())) {
    const name = remaining.slice(firstWord.length).trim();
    return { quantity, unit: firstWord, name: name || remaining };
  }

  // No unit — count item (e.g., "3 eggs")
  return { quantity, unit: null, name: remaining };
}

function extractQuantity(text: string): { quantity: number; rest: string } | null {
  // Check for leading unicode fraction
  for (const [char, value] of Object.entries(UNICODE_FRACTIONS)) {
    if (text.startsWith(char)) {
      return { quantity: value, rest: text.slice(char.length) };
    }
  }

  // Match: "1 1/2", "1/2", "1.5", or "1"
  const match = text.match(/^(\d+)\s+(\d+)\/(\d+)\s+(.*)$/s);
  if (match) {
    const whole = parseInt(match[1], 10);
    const num = parseInt(match[2], 10);
    const den = parseInt(match[3], 10);
    if (den !== 0) {
      return { quantity: whole + num / den, rest: match[4] };
    }
  }

  const fracMatch = text.match(/^(\d+)\/(\d+)\s+(.*)$/s);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den !== 0) {
      return { quantity: num / den, rest: fracMatch[3] };
    }
  }

  const decMatch = text.match(/^(\d+(?:\.\d+)?)\s+(.*)$/s);
  if (decMatch) {
    return { quantity: parseFloat(decMatch[1]), rest: decMatch[2] };
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/ingredient-parser.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingredient-parser.ts src/lib/ingredient-parser.test.ts
git commit -m "feat: add ingredient parser for structured quantity/unit/name extraction"
```

---

## Task 4: Scraper Notes Extraction

Extract substitutions, storage tips, make-ahead notes, serving suggestions, and technique notes from recipe page HTML. Separate module from the main scraper to keep responsibilities clear.

**Files:**
- Create: `src/lib/scraper-notes.ts`
- Create: `src/lib/scraper-notes.test.ts`
- Modify: `src/lib/scraper.ts` — add `recipeYield` to SchemaRecipe, call notes extraction

- [ ] **Step 1: Write failing tests for notes extraction**

```typescript
// src/lib/scraper-notes.test.ts
import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { extractRecipeNotes } from "./scraper-notes";

describe("extractRecipeNotes", () => {
  it("extracts from WPRM recipe notes section", () => {
    const html = `
      <div class="wprm-recipe-notes">
        <h3>Notes</h3>
        <p><strong>Storage:</strong> Keep refrigerated up to 3 days.</p>
        <p><strong>Substitution:</strong> Use almond milk instead of dairy milk.</p>
        <p><strong>Make ahead:</strong> Can be prepared the night before.</p>
      </div>
    `;
    const $ = cheerio.load(html);
    const notes = extractRecipeNotes($);
    expect(notes.storageTips).toContain("refrigerated");
    expect(notes.makeAheadNotes).toContain("night before");
  });

  it("extracts from headings containing keywords", () => {
    const html = `
      <h2>Substitutions</h2>
      <p>You can swap butter for coconut oil.</p>
      <h2>How to Store</h2>
      <p>Keeps in the fridge for up to 5 days.</p>
    `;
    const $ = cheerio.load(html);
    const notes = extractRecipeNotes($);
    expect(notes.storageTips).toContain("5 days");
  });

  it("returns empty strings when no notes found", () => {
    const $ = cheerio.load("<div><p>Just a regular page</p></div>");
    const notes = extractRecipeNotes($);
    expect(notes.storageTips).toBe("");
    expect(notes.makeAheadNotes).toBe("");
    expect(notes.servingSuggestions).toBe("");
    expect(notes.techniqueNotes).toBe("");
  });

  it("extracts serving suggestions", () => {
    const html = `
      <h3>Serving Suggestions</h3>
      <p>Serve over rice with a squeeze of lime.</p>
    `;
    const $ = cheerio.load(html);
    const notes = extractRecipeNotes($);
    expect(notes.servingSuggestions).toContain("rice");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/scraper-notes.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement scraper-notes.ts**

```typescript
// src/lib/scraper-notes.ts
import type { CheerioAPI } from "cheerio";

export interface RecipeNotes {
  storageTips: string;
  makeAheadNotes: string;
  servingSuggestions: string;
  techniqueNotes: string;
}

const SECTION_PATTERNS: { field: keyof RecipeNotes; keywords: RegExp }[] = [
  { field: "storageTips", keywords: /stor(age|e|ing)|refrigerat|freez|keep|leftover/i },
  { field: "makeAheadNotes", keywords: /make.?ahead|prep.?ahead|advance|prepare.?earlier|night.?before/i },
  { field: "servingSuggestions", keywords: /serv(e|ing).?(suggest|with|idea|tip)|pair.?with|goes.?well|accompan/i },
  { field: "techniqueNotes", keywords: /tip|trick|technique|chef|note|secret|why.?this.?works/i },
];

/**
 * Extract supplementary recipe notes from page HTML.
 * Looks for common recipe plugin note sections and keyword-bearing headings.
 */
export function extractRecipeNotes($: CheerioAPI): RecipeNotes {
  const result: RecipeNotes = {
    storageTips: "",
    makeAheadNotes: "",
    servingSuggestions: "",
    techniqueNotes: "",
  };

  // Strategy 1: Recipe plugin note sections
  const noteSelectors = [
    ".wprm-recipe-notes",
    ".tasty-recipe-notes",
    ".recipe-notes",
    '[class*="recipe-note"]',
    '[itemprop="recipeNotes"]',
  ];

  for (const selector of noteSelectors) {
    $(selector).each((_, el) => {
      const noteText = $(el).text().trim();
      if (!noteText) return;
      categorizeText(noteText, result);
    });
  }

  // Strategy 2: Headings containing keywords, capture sibling content
  $("h2, h3, h4, h5").each((_, el) => {
    const headingText = $(el).text().trim();
    for (const { field, keywords } of SECTION_PATTERNS) {
      if (keywords.test(headingText) && !result[field]) {
        // Collect text from sibling elements until next heading
        const content: string[] = [];
        let sibling = $(el).next();
        while (sibling.length && !sibling.is("h1, h2, h3, h4, h5")) {
          const text = sibling.text().trim();
          if (text) content.push(text);
          sibling = sibling.next();
        }
        if (content.length > 0) {
          result[field] = content.join(" ").slice(0, 1000);
        }
      }
    }
  });

  return result;
}

function categorizeText(text: string, result: RecipeNotes): void {
  // Split text by paragraphs/sentences and categorize each
  const parts = text.split(/\n+/).filter(Boolean);

  for (const part of parts) {
    for (const { field, keywords } of SECTION_PATTERNS) {
      if (keywords.test(part) && !result[field]) {
        // Remove the keyword label prefix if present (e.g., "Storage: ...")
        const cleaned = part.replace(/^[^:]+:\s*/i, "").trim();
        result[field] = cleaned.slice(0, 1000);
        break;
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/scraper-notes.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Update SchemaRecipe interface in scraper.ts**

In `src/lib/scraper.ts`, add `recipeYield` to the `SchemaRecipe` interface:

```typescript
interface SchemaRecipe {
  name?: string;
  image?: string | string[] | { url: string }[];
  recipeIngredient?: string[];
  recipeInstructions?: SchemaInstruction[] | string[] | string;
  cookTime?: string;
  prepTime?: string;
  totalTime?: string;
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
  keywords?: string | string[];
  suitableForDiet?: string | string[];
  recipeYield?: string | string[];  // ← ADD THIS
  [key: string]: unknown;
}
```

- [ ] **Step 6: Add `parseServings` helper to scraper.ts**

Add after the `parseDuration` function:

```typescript
/**
 * Parse recipeYield (e.g., "4 servings", "12 cookies", "6") to integer.
 */
export function parseServings(value?: string | string[] | null): number | null {
  if (!value) return null;
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) return null;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
```

- [ ] **Step 7: Export `extractRecipeFromPage` return type to include notes**

This will be handled in Task 5 (types update). For now, the scraper changes are structural preparation.

- [ ] **Step 8: Commit**

```bash
git add src/lib/scraper-notes.ts src/lib/scraper-notes.test.ts src/lib/scraper.ts
git commit -m "feat: add recipe notes extraction and recipeYield parsing"
```

---

## Task 5: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add SubstitutionData interface and update ExtractedRecipe**

Replace the full contents of `src/types/index.ts`:

```typescript
// src/types/index.ts

export interface SubstitutionData {
  ingredient: string;
  substitute: string;
  notes?: string;
}

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  images: string[];
  suggestedMealTypes: string[];
  suggestedCuisines: string[];
  suggestedDietary: string[];
  suggestedCookTimeMinutes: number | null;
  // New fields
  servings: number | null;
  substitutions: SubstitutionData[];
  storageTips: string;
  makeAheadNotes: string;
  servingSuggestions: string;
  techniqueNotes: string;
}

export interface CreateRecipeRequest {
  title: string;
  sourceUrl?: string;
  cookTime?: number;
  images: string[];
  ingredients: string[];
  instructions: string[];
  mealTypes: string[];
  cuisines: string[];
  dietary: string[];
  // New fields
  servings?: number;
  substitutions?: SubstitutionData[];
  storageTips?: string;
  makeAheadNotes?: string;
  servingSuggestions?: string;
  techniqueNotes?: string;
}

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
}

export interface RecipeDetail {
  id: string;
  title: string;
  sourceUrl: string | null;
  cookTime: number | null;
  images: string[];
  createdAt: string;
  servings: number | null;
  storageTips: string | null;
  makeAheadNotes: string | null;
  servingSuggestions: string | null;
  techniqueNotes: string | null;
  personalNotes: string | null;
  personalAdaptations: string | null;
  isFavorite: boolean;
  ingredients: {
    id: string;
    text: string;
    order: number;
    quantity: number | null;
    unit: string | null;
    name: string | null;
  }[];
  instructions: {
    id: string;
    text: string;
    order: number;
  }[];
  substitutions: {
    id: string;
    ingredient: string;
    substitute: string;
    notes: string | null;
    order: number;
  }[];
  tags: {
    name: string;
    type: "MEAL_TYPE" | "CUISINE" | "DIETARY";
  }[];
}
```

- [ ] **Step 2: Verify build compiles (expect errors from API routes — that's OK for now)**

Run: `pnpm exec tsc --noEmit 2>&1 | head -20`
Expected: Type errors in API routes and components that haven't been updated yet. This is expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: update TypeScript types for rich extraction and personal notes"
```

---

## Task 6: Update Scraper & Extract API

Wire up the notes extraction and ingredient parsing into the scraper pipeline and update the extract API response.

**Files:**
- Modify: `src/lib/scraper.ts`
- Modify: `src/app/api/extract/route.ts`

- [ ] **Step 1: Update `extractFromJsonLd` to return new fields**

In `src/lib/scraper.ts`, update the `extractFromJsonLd` function. Add the import at the top:

```typescript
import { extractRecipeNotes } from "./scraper-notes";
import { parseIngredient } from "./ingredient-parser";
```

Update the function signature and return to include notes. **Important:** The notes extraction must run on the **full, unstripped HTML** because `page.html` has already had nav, sidebar, comments, etc. removed by `scrapePage`. Recipe notes sections (`.wprm-recipe-notes`, keyword headings) may live outside the stripped content.

First, update the `ScrapedPage` interface to include `rawHtml`:

```typescript
interface ScrapedPage {
  html: string;
  rawHtml: string;  // ← ADD: full HTML before stripping
  jsonLd: SchemaRecipe | null;
  images: ImageCandidate[];
  url: string;
}
```

In `scrapePage`, capture the raw HTML before stripping:

```typescript
// After const $ = cheerio.load(html); and before the stripping section:
const rawHtml = html;

// ... existing stripping code ...

return { html: bodyHtml, rawHtml, jsonLd, images, url };
```

Update the `extractRecipeFromPage` function to use `rawHtml`:

```typescript
export function extractRecipeFromPage(page: ScrapedPage): ExtractedRecipe {
  const $notes = cheerio.load(page.rawHtml);
  const notes = extractRecipeNotes($notes);

  if (page.jsonLd) {
    return extractFromJsonLd(page.jsonLd, page.images, page.url, notes);
  }

  return extractFromHtml(page.html, page.images, page.url, notes);
}
```

Add a regular import at the top of `scraper.ts`:

```typescript
import type { RecipeNotes } from "./scraper-notes";
```

Update `extractFromJsonLd` to accept and pass through notes:

```typescript
function extractFromJsonLd(
  recipe: SchemaRecipe,
  pageImages: ImageCandidate[],
  baseUrl: string,
  notes: RecipeNotes
): ExtractedRecipe {
  // ... existing extraction code ...

  const servings = parseServings(recipe.recipeYield);

  return {
    title,
    ingredients,
    instructions,
    images,
    suggestedMealTypes,
    suggestedCuisines,
    suggestedDietary,
    suggestedCookTimeMinutes: cookTimeMinutes,
    servings,
    substitutions: [],  // Substitutions are extracted from HTML, not JSON-LD
    storageTips: notes.storageTips,
    makeAheadNotes: notes.makeAheadNotes,
    servingSuggestions: notes.servingSuggestions,
    techniqueNotes: notes.techniqueNotes,
  };
}
```

Similarly update `extractFromHtml` to accept notes and return the new fields with `servings: null` and `substitutions: []`.

- [ ] **Step 2: Update the extract API route response**

In `src/app/api/extract/route.ts`, the response already spreads `...recipe`, so the new fields will be included automatically since `extractRecipeFromPage` now returns them. No code change needed here — just verify.

- [ ] **Step 3: Verify build compiles (expect some errors in downstream files)**

Run: `pnpm exec tsc --noEmit 2>&1 | head -20`
Note: Errors in API routes and components are expected at this stage — they'll be fixed in Tasks 7-8.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scraper.ts src/app/api/extract/route.ts
git commit -m "feat: wire scraper notes extraction and servings parsing into extract pipeline"
```

---

## Task 7: Update Recipe CRUD API Routes

Add new fields to recipe creation (POST) and retrieval (GET). Add PUT endpoint for updating recipes (needed for personal notes, favorites).

**Files:**
- Modify: `src/app/api/recipes/route.ts`
- Modify: `src/app/api/recipes/[id]/route.ts`

- [ ] **Step 1: Update POST /api/recipes to handle new fields**

In `src/app/api/recipes/route.ts`, update the recipe create to include new fields:

```typescript
// In the POST handler, after the existing body parsing:
const recipe = await prisma.recipe.create({
  data: {
    id: recipeId,
    userId: user.id,
    title: body.title,
    sourceUrl: body.sourceUrl,
    cookTime: body.cookTime,
    images: storedImages,
    servings: body.servings ?? null,
    storageTips: body.storageTips ?? null,
    makeAheadNotes: body.makeAheadNotes ?? null,
    servingSuggestions: body.servingSuggestions ?? null,
    techniqueNotes: body.techniqueNotes ?? null,
    ingredients: {
      create: body.ingredients.map((text, i) => ({
        text,
        order: i,
        ...parseIngredientFields(text),
      })),
    },
    instructions: {
      create: body.instructions.map((text, i) => ({
        text,
        order: i,
      })),
    },
    substitutions: {
      create: (body.substitutions ?? []).map((sub, i) => ({
        ingredient: sub.ingredient,
        substitute: sub.substitute,
        notes: sub.notes ?? null,
        order: i,
      })),
    },
    tags: {
      create: tags.map((tag) => ({
        tagId: tag.id,
      })),
    },
  },
});
```

Add the helper at the top of the file:

```typescript
import { parseIngredient } from "@/lib/ingredient-parser";

function parseIngredientFields(text: string) {
  const parsed = parseIngredient(text);
  return {
    quantity: parsed.quantity,
    unit: parsed.unit,
    name: parsed.name,
  };
}
```

- [ ] **Step 2: Update GET /api/recipes to include isFavorite in result mapping**

In the GET handler's result mapping (the `recipes.map()` call), add `isFavorite` to the `RecipeCardData` object. Since the query uses `include` (not `select`), all scalar fields including the new `isFavorite` are already returned by Prisma. Just add it to the mapping:

```typescript
// In the recipes.map() result mapping, add:
isFavorite: r.isFavorite,
```

- [ ] **Step 3: Add PUT handler to /api/recipes/[id]/route.ts**

```typescript
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  // Only update fields that are provided
  const updateData: Record<string, unknown> = {};
  if (body.personalNotes !== undefined) updateData.personalNotes = body.personalNotes;
  if (body.personalAdaptations !== undefined) updateData.personalAdaptations = body.personalAdaptations;
  if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.cookTime !== undefined) updateData.cookTime = body.cookTime;
  if (body.servings !== undefined) updateData.servings = body.servings;
  if (body.storageTips !== undefined) updateData.storageTips = body.storageTips;
  if (body.makeAheadNotes !== undefined) updateData.makeAheadNotes = body.makeAheadNotes;
  if (body.servingSuggestions !== undefined) updateData.servingSuggestions = body.servingSuggestions;
  if (body.techniqueNotes !== undefined) updateData.techniqueNotes = body.techniqueNotes;

  const updated = await prisma.recipe.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Update GET /api/recipes/[id] to return new fields and update lastViewedAt**

```typescript
// After fetching recipe, update lastViewedAt
await prisma.recipe.update({
  where: { id },
  data: { lastViewedAt: new Date() },
});

// In the result mapping, add the new fields:
const result: RecipeDetail = {
  // ...existing fields...
  servings: recipe.servings,
  storageTips: recipe.storageTips,
  makeAheadNotes: recipe.makeAheadNotes,
  servingSuggestions: recipe.servingSuggestions,
  techniqueNotes: recipe.techniqueNotes,
  personalNotes: recipe.personalNotes,
  personalAdaptations: recipe.personalAdaptations,
  isFavorite: recipe.isFavorite,
  substitutions: recipe.substitutions.map((s) => ({
    id: s.id,
    ingredient: s.ingredient,
    substitute: s.substitute,
    notes: s.notes,
    order: s.order,
  })),
  // ...rest of existing fields...
};
```

Also update the Prisma `include` to add `substitutions: { orderBy: { order: "asc" } }`.

- [ ] **Step 5: Verify build compiles**

Run: `pnpm exec tsc --noEmit 2>&1 | head -20`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/recipes/route.ts src/app/api/recipes/[id]/route.ts
git commit -m "feat: update recipe CRUD routes with new fields and PUT endpoint"
```

---

## Task 8: Update Import Form

Add new fields (servings, substitutions, storage tips, etc.) to the import review/edit form.

**Files:**
- Modify: `src/components/recipes/ImportForm.tsx`

- [ ] **Step 1: Add new state variables**

After the existing state declarations, add:

```typescript
const [servings, setServings] = useState("");
const [substitutions, setSubstitutions] = useState<
  { ingredient: string; substitute: string; notes: string }[]
>([]);
const [storageTips, setStorageTips] = useState("");
const [makeAheadNotes, setMakeAheadNotes] = useState("");
const [servingSuggestions, setServingSuggestions] = useState("");
const [techniqueNotes, setTechniqueNotes] = useState("");
```

- [ ] **Step 2: Populate new state from extraction response**

In the `handleExtract` function, after the existing field population, add:

```typescript
setServings(recipe.servings?.toString() ?? "");
setSubstitutions(
  recipe.substitutions?.map((s) => ({
    ingredient: s.ingredient,
    substitute: s.substitute,
    notes: s.notes ?? "",
  })) ?? []
);
setStorageTips(recipe.storageTips ?? "");
setMakeAheadNotes(recipe.makeAheadNotes ?? "");
setServingSuggestions(recipe.servingSuggestions ?? "");
setTechniqueNotes(recipe.techniqueNotes ?? "");
```

- [ ] **Step 3: Include new fields in save payload**

In `handleSave`, add to the JSON body:

```typescript
servings: servings ? parseInt(servings, 10) : undefined,
substitutions: substitutions.filter((s) => s.ingredient && s.substitute),
storageTips: storageTips || undefined,
makeAheadNotes: makeAheadNotes || undefined,
servingSuggestions: servingSuggestions || undefined,
techniqueNotes: techniqueNotes || undefined,
```

- [ ] **Step 4: Add new form fields to the review/edit UI**

After the cook time `<Input>` and before the `<Divider>`, add:

```tsx
<Input
  label="Servings"
  type="number"
  value={servings}
  onChange={(e) => setServings(e.target.value)}
  placeholder="4"
  min="1"
/>

{/* Substitutions */}
<div>
  <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
    Substitutions
  </label>
  {substitutions.map((sub, i) => (
    <div key={i} className="flex gap-2 mb-2 items-start">
      <input
        value={sub.ingredient}
        onChange={(e) => {
          const updated = [...substitutions];
          updated[i] = { ...updated[i], ingredient: e.target.value };
          setSubstitutions(updated);
        }}
        placeholder="Original ingredient"
        className="flex-1 border border-gray-300 px-3 py-2 font-serif text-sm text-black focus:outline-none focus:border-black transition-colors"
      />
      <span className="text-gray-500 py-2">→</span>
      <input
        value={sub.substitute}
        onChange={(e) => {
          const updated = [...substitutions];
          updated[i] = { ...updated[i], substitute: e.target.value };
          setSubstitutions(updated);
        }}
        placeholder="Substitute"
        className="flex-1 border border-gray-300 px-3 py-2 font-serif text-sm text-black focus:outline-none focus:border-black transition-colors"
      />
      <button
        onClick={() => setSubstitutions(substitutions.filter((_, j) => j !== i))}
        className="text-gray-500 hover:text-black px-2 py-2 text-sm"
        aria-label="Remove substitution"
      >
        &times;
      </button>
    </div>
  ))}
  <button
    onClick={() =>
      setSubstitutions([...substitutions, { ingredient: "", substitute: "", notes: "" }])
    }
    className="font-sans text-xs text-gray-600 hover:text-black transition-colors"
  >
    + Add substitution
  </button>
</div>

{/* Collapsible supplementary notes */}
<details className="group">
  <summary className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-black transition-colors">
    Additional Notes (storage, tips, serving)
  </summary>
  <div className="space-y-4 mt-4">
    <div>
      <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
        Storage Tips
      </label>
      <textarea
        value={storageTips}
        onChange={(e) => setStorageTips(e.target.value)}
        rows={2}
        placeholder="How to store leftovers..."
        className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
      />
    </div>
    <div>
      <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
        Make-Ahead Notes
      </label>
      <textarea
        value={makeAheadNotes}
        onChange={(e) => setMakeAheadNotes(e.target.value)}
        rows={2}
        placeholder="Prep-ahead instructions..."
        className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
      />
    </div>
    <div>
      <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
        Serving Suggestions
      </label>
      <textarea
        value={servingSuggestions}
        onChange={(e) => setServingSuggestions(e.target.value)}
        rows={2}
        placeholder="What to serve with..."
        className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
      />
    </div>
    <div>
      <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
        Technique Notes
      </label>
      <textarea
        value={techniqueNotes}
        onChange={(e) => setTechniqueNotes(e.target.value)}
        rows={2}
        placeholder="Tips and tricks..."
        className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
      />
    </div>
  </div>
</details>
```

- [ ] **Step 5: Verify the import page loads without errors**

Run: `pnpm dev` and navigate to `/import`
Expected: Page loads with new form fields visible in review step.

- [ ] **Step 6: Commit**

```bash
git add src/components/recipes/ImportForm.tsx
git commit -m "feat: add rich extraction fields to import review form"
```

---

## Task 9: Image Carousel Component

**Files:**
- Create: `src/components/recipes/ImageCarousel.tsx`

- [ ] **Step 1: Create ImageCarousel component**

```tsx
// src/components/recipes/ImageCarousel.tsx
"use client";

import { useState, useCallback } from "react";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  overlay?: boolean; // true = gradient overlay for booklet hero
}

export default function ImageCarousel({
  images,
  alt,
  className = "",
  overlay = false,
}: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(index, images.length - 1)));
    },
    [images.length]
  );

  if (images.length === 0) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={images[current]}
        alt={`${alt} - image ${current + 1}`}
        className="w-full h-full object-cover"
      />

      {overlay && (
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/40"
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Prev/Next tap zones */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => goTo(current - 1)}
            className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
            aria-label="Previous image"
            disabled={current === 0}
          />
          <button
            onClick={() => goTo(current + 1)}
            className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
            aria-label="Next image"
            disabled={current === images.length - 1}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recipes/ImageCarousel.tsx
git commit -m "feat: add ImageCarousel component with dots and tap navigation"
```

---

## Task 10: FavoriteButton Component

**Files:**
- Create: `src/components/recipes/FavoriteButton.tsx`

- [ ] **Step 1: Create FavoriteButton component**

```tsx
// src/components/recipes/FavoriteButton.tsx
"use client";

import { useState } from "react";

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorite: boolean;
  className?: string;
}

export default function FavoriteButton({
  recipeId,
  initialFavorite,
  className = "",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;
    setSaving(true);

    const newValue = !isFavorite;
    setIsFavorite(newValue); // optimistic update

    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });

      if (!res.ok) {
        setIsFavorite(!newValue); // revert on failure
      }
    } catch {
      setIsFavorite(!newValue); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={`transition-colors ${className}`}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={isFavorite ? 0 : 1.5}
        className={`w-5 h-5 ${isFavorite ? "text-red" : "text-gray-500 hover:text-gray-900"}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Add FavoriteButton to RecipeCard**

In `src/components/recipes/RecipeCard.tsx`, import and add `FavoriteButton` to the card. Position it in the top-right corner of the hero image:

```tsx
import FavoriteButton from "./FavoriteButton";

// Add isFavorite to the component props (passed via RecipeCardData)
// In the hero image container, add:
<FavoriteButton
  recipeId={recipe.id}
  initialFavorite={recipe.isFavorite}
  className="absolute top-2 right-2 z-10"
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes/FavoriteButton.tsx src/components/recipes/RecipeCard.tsx
git commit -m "feat: add FavoriteButton component and integrate into RecipeCard"
```

---

## Task 11: PersonalNotes Component

Inline-editable personal story and adaptations for the booklet view.

**Files:**
- Create: `src/components/recipes/PersonalNotes.tsx`

- [ ] **Step 1: Create PersonalNotes component**

```tsx
// src/components/recipes/PersonalNotes.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface PersonalNotesProps {
  recipeId: string;
  initialNotes: string | null;
  initialAdaptations: string | null;
}

export default function PersonalNotes({
  recipeId,
  initialNotes,
  initialAdaptations,
}: PersonalNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [adaptations, setAdaptations] = useState(initialAdaptations ?? "");
  const [editing, setEditing] = useState<"notes" | "adaptations" | null>(null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalNotes: notes, personalAdaptations: adaptations }),
      });
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  const showEmpty = !notes && !adaptations && !editing;

  return (
    <div className="my-5">
      {/* Story section */}
      {editing === "notes" ? (
        <div className="pl-5 border-l-2 border-gray-200">
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Our Story
          </label>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What does this recipe mean to you?"
            className="w-full border border-gray-300 px-3 py-2 font-serif text-base italic text-gray-600 placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-y"
          />
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 mt-4">
            My Adaptations
          </label>
          <textarea
            value={adaptations}
            onChange={(e) => setAdaptations(e.target.value)}
            rows={2}
            placeholder="Changes you've made to the original..."
            className="w-full border border-gray-300 px-3 py-2 font-serif text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-y"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="font-sans text-xs font-semibold text-black hover:text-gray-600 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setNotes(initialNotes ?? "");
                setAdaptations(initialAdaptations ?? "");
                setEditing(null);
              }}
              className="font-sans text-xs text-gray-500 hover:text-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {(notes || adaptations) && (
            <div
              className="pl-5 border-l-2 border-gray-200 cursor-pointer group"
              onClick={() => setEditing("notes")}
            >
              {notes && (
                <p className="font-serif text-base italic leading-relaxed text-gray-600">
                  {notes}
                </p>
              )}
              {adaptations && (
                <p className="font-serif text-sm text-gray-500 mt-2">
                  <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Adaptations:
                  </span>{" "}
                  {adaptations}
                </p>
              )}
              <span className="font-sans text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                Click to edit
              </span>
            </div>
          )}

          {showEmpty && (
            <button
              onClick={() => setEditing("notes")}
              className="pl-5 border-l-2 border-gray-200 block w-full text-left"
            >
              <p className="font-serif text-base italic text-gray-400">
                Add your story...
              </p>
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recipes/PersonalNotes.tsx
git commit -m "feat: add PersonalNotes inline-editable component"
```

---

## Task 12: RecipePage Component (Image-Forward Booklet View)

The full-page recipe layout for the booklet — hero image dominates, scroll reveals details.

**Files:**
- Create: `src/components/recipes/RecipePage.tsx`

- [ ] **Step 1: Create RecipePage component**

```tsx
// src/components/recipes/RecipePage.tsx
"use client";

import ImageCarousel from "./ImageCarousel";
import PersonalNotes from "./PersonalNotes";
import FavoriteButton from "./FavoriteButton";
import Divider from "@/components/ui/Divider";
import type { RecipeDetail } from "@/types";

interface RecipePageProps {
  recipe: RecipeDetail;
  pageIndex?: number;
  totalPages?: number;
  onClose?: () => void;
}

export default function RecipePage({
  recipe,
  pageIndex,
  totalPages,
  onClose,
}: RecipePageProps) {
  const mealTypes = recipe.tags
    .filter((t) => t.type === "MEAL_TYPE")
    .map((t) => t.name);
  const cuisines = recipe.tags
    .filter((t) => t.type === "CUISINE")
    .map((t) => t.name);
  const heroImages = recipe.images.slice(0, 4);
  const additionalImages = recipe.images.slice(4);

  const rubricParts = [...mealTypes, ...cuisines].filter(Boolean);

  return (
    <div className="bg-white max-w-article mx-auto overflow-y-auto max-h-[90vh]">
      {/* Hero Image */}
      <div className="relative w-full h-[50vh] md:h-[65vh]">
        <ImageCarousel
          images={heroImages}
          alt={recipe.title}
          className="w-full h-full"
          overlay
        />

        {/* Page indicator */}
        {pageIndex !== undefined && totalPages !== undefined && (
          <div className="absolute top-4 left-5 font-sans text-xs font-semibold tracking-wider text-white/70 uppercase">
            {pageIndex + 1} / {totalPages}
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-5 text-white/70 hover:text-white text-xl transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        )}

        {/* Favorite */}
        <FavoriteButton
          recipeId={recipe.id}
          initialFavorite={recipe.isFavorite}
          className="absolute top-4 right-14 text-white"
        />

        {/* Title overlay */}
        <div className="absolute bottom-5 left-6 right-6">
          {rubricParts.length > 0 && (
            <div className="font-display text-sm font-normal text-white/70 tracking-normal mb-2">
              {rubricParts.join(" · ").toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-2xl md:text-5xl font-black leading-none text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            {recipe.title}
          </h1>
        </div>
      </div>

      {/* Content below hero */}
      <div className="px-6 py-5">
        {/* Tags row */}
        <div className="flex gap-2 flex-wrap items-center">
          {recipe.cookTime && (
            <span className="font-sans text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1">
              {recipe.cookTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="font-sans text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1">
              {recipe.servings} servings
            </span>
          )}
          {recipe.tags
            .filter((t) => t.type === "DIETARY")
            .map((t) => (
              <span
                key={t.name}
                className="font-sans text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1"
              >
                {t.name}
              </span>
            ))}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs font-semibold text-red hover:text-red-dark transition-colors ml-auto"
            >
              View Original &rarr;
            </a>
          )}
        </div>

        {/* Personal notes */}
        <PersonalNotes
          recipeId={recipe.id}
          initialNotes={recipe.personalNotes}
          initialAdaptations={recipe.personalAdaptations}
        />

        <Divider className="my-5" />

        {/* Ingredients & Instructions */}
        <div className="md:grid md:grid-cols-[1fr_1.4fr] md:gap-0">
          {/* Ingredients */}
          <div className="md:pr-5 md:border-r md:border-gray-200 mb-6 md:mb-0">
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Ingredients
            </h2>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing.id}
                  className="font-serif text-sm leading-relaxed text-black"
                >
                  {ing.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="md:pl-5">
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Instructions
            </h2>
            <ol className="space-y-3">
              {recipe.instructions.map((inst, i) => (
                <li key={inst.id} className="flex gap-3">
                  <span className="font-display text-xl font-black text-red/40 select-none shrink-0 w-7">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-serif text-sm leading-relaxed text-black">
                    {inst.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Substitutions */}
        {recipe.substitutions.length > 0 && (
          <>
            <Divider className="my-5" />
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Substitutions
            </h2>
            <div className="space-y-1.5">
              {recipe.substitutions.map((sub) => (
                <div key={sub.id} className="font-serif text-sm leading-relaxed text-gray-600">
                  <strong className="text-black">{sub.ingredient} →</strong>{" "}
                  {sub.substitute}
                  {sub.notes && (
                    <span className="text-gray-500"> ({sub.notes})</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Supplementary notes */}
        {(recipe.storageTips || recipe.makeAheadNotes || recipe.servingSuggestions || recipe.techniqueNotes) && (
          <>
            <Divider className="my-5" />
            <div className="space-y-4">
              {recipe.storageTips && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Storage
                  </h3>
                  <p className="font-serif text-sm leading-relaxed text-gray-600">
                    {recipe.storageTips}
                  </p>
                </div>
              )}
              {recipe.makeAheadNotes && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Make Ahead
                  </h3>
                  <p className="font-serif text-sm leading-relaxed text-gray-600">
                    {recipe.makeAheadNotes}
                  </p>
                </div>
              )}
              {recipe.servingSuggestions && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Serving Suggestions
                  </h3>
                  <p className="font-serif text-sm leading-relaxed text-gray-600">
                    {recipe.servingSuggestions}
                  </p>
                </div>
              )}
              {recipe.techniqueNotes && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Tips
                  </h3>
                  <p className="font-serif text-sm leading-relaxed text-gray-600">
                    {recipe.techniqueNotes}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Additional images */}
        {additionalImages.length > 0 && (
          <>
            <Divider className="my-5" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {additionalImages.map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden bg-gray-50">
                  <img
                    src={src}
                    alt={`${recipe.title} - image ${i + 5}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recipes/RecipePage.tsx
git commit -m "feat: add image-forward RecipePage component for booklet view"
```

---

## Task 13: RecipeBooklet Component

Overlay wrapper that displays RecipePage with prev/next navigation and keyboard support.

**Files:**
- Create: `src/components/recipes/RecipeBooklet.tsx`

- [ ] **Step 1: Create RecipeBooklet component**

```tsx
// src/components/recipes/RecipeBooklet.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import RecipePage from "./RecipePage";
import type { RecipeDetail } from "@/types";

interface RecipeBookletProps {
  recipeIds: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function RecipeBooklet({
  recipeIds,
  initialIndex,
  onClose,
}: RecipeBookletProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecipe = useCallback(async (index: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeIds[index]}`);
      if (res.ok) {
        const data = await res.json();
        setRecipe(data);
      }
    } finally {
      setLoading(false);
    }
  }, [recipeIds]);

  useEffect(() => {
    fetchRecipe(currentIndex);
  }, [currentIndex, fetchRecipe]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < recipeIds.length - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, recipeIds.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, onClose]);

  // Prevent body scroll when booklet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Booklet card */}
      <div className="relative z-10 w-[92vw] max-w-article bg-white mx-auto rounded-[8px] overflow-hidden animate-slideUp">
        {loading ? (
          <div className="flex items-center justify-center h-[70vh]">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recipe ? (
          <RecipePage
            recipe={recipe}
            pageIndex={currentIndex}
            totalPages={recipeIds.length}
            onClose={onClose}
          />
        ) : (
          <div className="flex items-center justify-center h-[70vh]">
            <p className="font-sans text-sm text-gray-500">Recipe not found</p>
          </div>
        )}
      </div>

      {/* Nav arrows */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-black transition-colors rounded-full"
          aria-label="Previous recipe"
        >
          &larr;
        </button>
      )}
      {currentIndex < recipeIds.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-black transition-colors rounded-full"
          aria-label="Next recipe"
        >
          &rarr;
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add slideUp keyframe to globals.css**

In `src/app/globals.css`, add inside the `@theme` block:

```css
--animate-slideUp: slideUp 350ms cubic-bezier(0.16, 1, 0.3, 1);
```

And add the keyframe outside the `@theme` block:

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes/RecipeBooklet.tsx src/app/globals.css
git commit -m "feat: add RecipeBooklet overlay with keyboard navigation"
```

---

## Task 14: Integrate Booklet into Recipes Page

Wire up the RecipeBooklet into the recipes collection page. Clicking a recipe card opens the booklet at that position.

**Files:**
- Modify: `src/app/recipes/page.tsx`
- Modify: `src/components/recipes/RecipeGrid.tsx`
- Modify: `src/components/recipes/RecipeCard.tsx`

- [ ] **Step 1: Convert RecipeGrid to accept an onCardClick callback**

In `src/components/recipes/RecipeGrid.tsx`, update to accept and forward click handlers:

```tsx
interface RecipeGridProps {
  recipes: RecipeCardData[];
  onCardClick?: (index: number) => void;
}

export default function RecipeGrid({ recipes, onCardClick }: RecipeGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
      {recipes.map((recipe, index) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={onCardClick ? () => onCardClick(index) : undefined}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update RecipeCard to support onClick prop**

In `src/components/recipes/RecipeCard.tsx`, add an `onClick` prop to the component interface:

```tsx
interface RecipeCardProps {
  recipe: RecipeCardData;
  onClick?: () => void;
}
```

The card currently wraps everything in a `<Link>`. When `onClick` is provided, intercept the click to open the booklet instead of navigating. Update the wrapping element:

```tsx
// Replace the <Link> wrapper with:
<Link
  href={`/recipes/${recipe.id}`}
  onClick={(e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  }}
>
```

This preserves the link for accessibility (right-click → open in new tab still works) while intercepting normal clicks to open the booklet.

- [ ] **Step 3: Create a client wrapper for the recipes page**

Since the recipes page is a server component and the booklet requires client state, create a client wrapper:

```tsx
// At top of src/app/recipes/page.tsx, extract the grid + booklet into a client component
// Or create a new component src/components/recipes/RecipeCollection.tsx
```

Create `src/components/recipes/RecipeCollection.tsx`:

```tsx
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
```

- [ ] **Step 4: Update recipes page to use RecipeCollection and include isFavorite**

In `src/app/recipes/page.tsx`:

1. Replace `<RecipeGrid recipes={...} />` with `<RecipeCollection recipes={...} />` and update the import.

2. **Important:** The server component builds `RecipeCardData` objects directly from Prisma results. Add `isFavorite: r.isFavorite` to the `recipeCards` mapping object so the type matches. The Prisma query already returns all scalar fields (including the new `isFavorite` after migration), it just needs to be included in the mapped output.

- [ ] **Step 5: Verify end-to-end flow**

Run: `pnpm dev` and navigate to `/recipes`
Expected:
- Recipe cards display in grid
- Clicking a card opens the booklet overlay with image-forward layout
- Arrow keys navigate between recipes
- Escape closes the booklet
- Favorite button toggles
- Personal notes can be edited inline

- [ ] **Step 6: Commit**

```bash
git add src/components/recipes/RecipeCollection.tsx src/components/recipes/RecipeGrid.tsx src/components/recipes/RecipeCard.tsx src/app/recipes/page.tsx
git commit -m "feat: integrate booklet view into recipes page with card click navigation"
```

---

## Task 15: Update Recipe Detail Page

Update the standalone recipe detail page (`/recipes/[id]`) to use the new image-forward layout and display all new fields.

**Files:**
- Modify: `src/app/recipes/[id]/page.tsx`

- [ ] **Step 1: Update the page to use RecipePage component**

Replace the current layout with the RecipePage component, but in standalone mode (no booklet navigation):

```tsx
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import RecipePage from "@/components/recipes/RecipePage";
import DeleteRecipeButton from "@/components/recipes/DeleteRecipeButton";
import Divider from "@/components/ui/Divider";
import type { RecipeDetail } from "@/types";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      instructions: { orderBy: { order: "asc" } },
      substitutions: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recipe || recipe.userId !== user.id) notFound();

  // Update lastViewedAt
  await prisma.recipe.update({
    where: { id },
    data: { lastViewedAt: new Date() },
  });

  const recipeDetail: RecipeDetail = {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.sourceUrl,
    cookTime: recipe.cookTime,
    images: recipe.images,
    createdAt: recipe.createdAt.toISOString(),
    servings: recipe.servings,
    storageTips: recipe.storageTips,
    makeAheadNotes: recipe.makeAheadNotes,
    servingSuggestions: recipe.servingSuggestions,
    techniqueNotes: recipe.techniqueNotes,
    personalNotes: recipe.personalNotes,
    personalAdaptations: recipe.personalAdaptations,
    isFavorite: recipe.isFavorite,
    ingredients: recipe.ingredients.map((i) => ({
      id: i.id,
      text: i.text,
      order: i.order,
      quantity: i.quantity,
      unit: i.unit,
      name: i.name,
    })),
    instructions: recipe.instructions.map((i) => ({
      id: i.id,
      text: i.text,
      order: i.order,
    })),
    substitutions: recipe.substitutions.map((s) => ({
      id: s.id,
      ingredient: s.ingredient,
      substitute: s.substitute,
      notes: s.notes,
      order: s.order,
    })),
    tags: recipe.tags.map((rt) => ({
      name: rt.tag.name,
      type: rt.tag.type,
    })),
  };

  return (
    <main className="max-w-article mx-auto py-8">
      <RecipePage recipe={recipeDetail} />
      <Divider className="my-6" />
      <div className="flex justify-end px-6">
        <DeleteRecipeButton recipeId={recipe.id} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the detail page renders**

Run: `pnpm dev` and navigate to `/recipes/[id]` for an existing recipe.
Expected: Image-forward layout with all new sections.

- [ ] **Step 3: Commit**

```bash
git add src/app/recipes/[id]/page.tsx
git commit -m "feat: update recipe detail page with image-forward layout and new fields"
```

---

## Task 16: Final Build Verification

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (ingredient parser + scraper notes).

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors (or only pre-existing ones).

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: Build succeeds.

---

## Deferred Items (Not in This Plan)

These items from the spec are intentionally deferred to avoid scope creep:

- **FilterBar favorites toggle** — the `isFavorite` field exists and is togglable, but FilterBar integration (adding a "Favorites" pill and server-side filtering) is deferred to when the FilterBar is built in the booklet/filtering phase.
- **Touch swipe on ImageCarousel** — the spec mentions swipe gestures. The carousel has tap zones for prev/next but not touch swipe handlers. This can be added as a polish item later (use `onTouchStart`/`onTouchEnd` delta tracking).
- **Touch swipe on RecipeBooklet** — similarly, mobile swipe between recipes is deferred to the polish phase.

---

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from Plan A implementation"
```

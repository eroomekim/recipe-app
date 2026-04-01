import type { RecipeCardData, RecipeDetail } from "@/types";

export function makeRecipeCard(overrides: Partial<RecipeCardData> = {}): RecipeCardData {
  return {
    id: "recipe-1",
    title: "Braised Short Ribs",
    images: ["https://example.com/ribs.jpg"],
    cookTime: 180,
    createdAt: "2026-01-15T00:00:00.000Z",
    ingredientCount: 12,
    instructionCount: 8,
    firstInstruction: "Season the ribs generously with salt and pepper.",
    isFavorite: false,
    tags: [
      { name: "Dinner", type: "MEAL_TYPE" },
      { name: "Italian", type: "CUISINE" },
    ],
    nutrition: {
      calories: 650,
      protein: 45,
      carbs: 12,
      fat: 42,
      fiber: 2,
      sugar: 4,
      sodium: 890,
    },
    ...overrides,
  };
}

export function makeRecipeDetail(overrides: Partial<RecipeDetail> = {}): RecipeDetail {
  return {
    id: "recipe-1",
    title: "Braised Short Ribs",
    sourceUrl: "https://example.com/braised-short-ribs",
    cookTime: 180,
    images: ["https://example.com/ribs.jpg", "https://example.com/ribs-2.jpg"],
    createdAt: "2026-01-15T00:00:00.000Z",
    servings: 4,
    storageTips: "Store in the fridge for up to 3 days.",
    makeAheadNotes: null,
    servingSuggestions: null,
    techniqueNotes: null,
    personalNotes: null,
    personalAdaptations: null,
    isFavorite: false,
    nutrition: {
      calories: 650,
      fat: 42,
      protein: 45,
      carbs: 12,
      fiber: 2,
      sugar: 4,
      sodium: 890,
      estimated: true,
    },
    ingredients: [
      { id: "ing-1", text: "3 lbs short ribs", order: 0, quantity: 3, unit: "lbs", name: "short ribs" },
      { id: "ing-2", text: "2 onions, diced", order: 1, quantity: 2, unit: null, name: "onions" },
      { id: "ing-3", text: "4 cloves garlic", order: 2, quantity: 4, unit: "cloves", name: "garlic" },
      { id: "ing-4", text: "2 cups red wine", order: 3, quantity: 2, unit: "cups", name: "red wine" },
    ],
    instructions: [
      { id: "ins-1", text: "Season the ribs generously with salt and pepper.", order: 0, imageUrl: null },
      { id: "ins-2", text: "Sear in a hot Dutch oven until browned on all sides.", order: 1, imageUrl: null },
      { id: "ins-3", text: "Add vegetables and deglaze with wine.", order: 2, imageUrl: null },
    ],
    substitutions: [],
    tags: [
      { name: "Dinner", type: "MEAL_TYPE" },
      { name: "Italian", type: "CUISINE" },
    ],
    ...overrides,
  };
}

export function makeGroceryItem(overrides: Partial<{
  id: string;
  text: string;
  recipeId: string | null;
  recipeTitle: string | null;
  checked: boolean;
}> = {}) {
  return {
    id: "grocery-1",
    text: "3 lbs short ribs",
    recipeId: null,
    recipeTitle: null,
    checked: false,
    ...overrides,
  };
}

/**
 * Helper to mock fetch for specific URL patterns.
 * Returns a cleanup function.
 */
export function mockFetch(handlers: Record<string, unknown>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";

    for (const [pattern, response] of Object.entries(handlers)) {
      // Pattern format: "GET /api/recipes" or just "/api/recipes"
      const [patternMethod, patternPath] = pattern.includes(" ")
        ? pattern.split(" ", 2)
        : ["GET", pattern];

      if (method === patternMethod && url.includes(patternPath!)) {
        if (typeof response === "function") {
          return response(url, init);
        }
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Default: return empty success
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

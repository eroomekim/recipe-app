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

export function computeRuleBasedCollections(
  recipes: RecipeForCollections[]
): SmartCollectionData[] {
  const results: SmartCollectionData[] = [];

  const favorites = recipes.filter((r) => r.isFavorite);
  if (favorites.length > 0) {
    results.push(makeCollection("favorites", "Favorites", "rule", favorites));
  }

  const quick = recipes.filter((r) => r.cookTime !== null && r.cookTime <= 30);
  if (quick.length > 0) {
    results.push(makeCollection("quick-30", "Under 30 Minutes", "rule", quick));
  }

  const fewIngredients = recipes.filter((r) => r._count.ingredients <= 5 && r._count.ingredients > 0);
  if (fewIngredients.length > 0) {
    results.push(makeCollection("few-ingredients", "5 Ingredients or Fewer", "rule", fewIngredients));
  }

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

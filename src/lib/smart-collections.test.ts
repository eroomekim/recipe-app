import { describe, it, expect } from "vitest";
import { computeRuleBasedCollections } from "./smart-collections";

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

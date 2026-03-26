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

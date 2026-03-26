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

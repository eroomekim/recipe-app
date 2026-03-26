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

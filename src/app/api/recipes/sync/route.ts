import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth";
import type { RecipeDetail } from "@/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUser(user);

  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(0);

  const recipes = await prisma.recipe.findMany({
    where: {
      userId: user.id,
      updatedAt: { gt: since },
    },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      instructions: { orderBy: { order: "asc" } },
      substitutions: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  const deletions = await prisma.recipeDeletion.findMany({
    where: {
      userId: user.id,
      deletedAt: { gt: since },
    },
    select: { recipeId: true },
  });

  // Clean up old deletion records (> 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  await prisma.recipeDeletion.deleteMany({
    where: { deletedAt: { lt: ninetyDaysAgo } },
  });

  const syncTimestamp = new Date().toISOString();

  const updated: RecipeDetail[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    sourceUrl: r.sourceUrl,
    cookTime: r.cookTime,
    images: r.images,
    createdAt: r.createdAt.toISOString(),
    servings: r.servings,
    storageTips: r.storageTips,
    makeAheadNotes: r.makeAheadNotes,
    servingSuggestions: r.servingSuggestions,
    techniqueNotes: r.techniqueNotes,
    personalNotes: r.personalNotes,
    personalAdaptations: r.personalAdaptations,
    isFavorite: r.isFavorite,
    nutrition: r.nutritionCalories !== null || r.nutritionFat !== null
      ? {
          calories: r.nutritionCalories,
          fat: r.nutritionFat,
          protein: r.nutritionProtein,
          carbs: r.nutritionCarbs,
          fiber: r.nutritionFiber,
          sugar: r.nutritionSugar,
          sodium: r.nutritionSodium,
          estimated: r.nutritionEstimated,
        }
      : null,
    ingredients: r.ingredients.map((i) => ({
      id: i.id,
      text: i.text,
      order: i.order,
      quantity: i.quantity,
      unit: i.unit,
      name: i.name,
    })),
    instructions: r.instructions.map((i) => ({
      id: i.id,
      text: i.text,
      order: i.order,
      imageUrl: i.imageUrl,
    })),
    substitutions: r.substitutions.map((s) => ({
      id: s.id,
      ingredient: s.ingredient,
      substitute: s.substitute,
      notes: s.notes,
      order: s.order,
    })),
    tags: r.tags.map((rt) => ({
      name: rt.tag.name,
      type: rt.tag.type,
    })),
  }));

  return NextResponse.json({
    updated,
    deletedIds: deletions.map((d) => d.recipeId),
    syncTimestamp,
  });
}

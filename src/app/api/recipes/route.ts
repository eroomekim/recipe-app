import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth";
import { uploadRecipeImages } from "@/lib/storage";
import { createId } from "@paralleldrive/cuid2";
import type { CreateRecipeRequest, RecipeCardData } from "@/types";
import { parseIngredient } from "@/lib/ingredient-parser";
import { estimateNutrition } from "@/lib/nutrition-estimator";

function parseIngredientFields(text: string) {
  const parsed = parseIngredient(text);
  return {
    quantity: parsed.quantity,
    unit: parsed.unit,
    name: parsed.name,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUser(user);

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      tags: {
        include: { tag: true },
      },
      instructions: {
        orderBy: { order: "asc" },
        take: 1,
      },
      _count: {
        select: {
          ingredients: true,
          instructions: true,
        },
      },
    },
  });

  const result: RecipeCardData[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    images: r.images,
    cookTime: r.cookTime,
    createdAt: r.createdAt.toISOString(),
    ingredientCount: r._count.ingredients,
    instructionCount: r._count.instructions,
    firstInstruction: r.instructions[0]?.text ?? null,
    isFavorite: r.isFavorite,
    tags: r.tags.map((rt) => ({
      name: rt.tag.name,
      type: rt.tag.type,
    })),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureUser(user);

  const body: CreateRecipeRequest = await request.json();
  const recipeId = createId();

  // Download and upload images to Supabase Storage
  const storedImages = await uploadRecipeImages(
    body.images,
    user.id,
    recipeId
  );

  // Resolve tag names to IDs
  const tagNames = [
    ...body.mealTypes.map((name) => ({ name, type: "MEAL_TYPE" as const })),
    ...body.cuisines.map((name) => ({ name, type: "CUISINE" as const })),
    ...body.dietary.map((name) => ({ name, type: "DIETARY" as const })),
  ];

  const tags = await prisma.tag.findMany({
    where: {
      OR: tagNames.map((t) => ({ name: t.name, type: t.type })),
    },
  });

  // Create recipe with all relations in a transaction
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
      nutritionCalories: body.nutrition?.calories ?? null,
      nutritionFat: body.nutrition?.fat ?? null,
      nutritionProtein: body.nutrition?.protein ?? null,
      nutritionCarbs: body.nutrition?.carbs ?? null,
      nutritionFiber: body.nutrition?.fiber ?? null,
      nutritionSugar: body.nutrition?.sugar ?? null,
      nutritionSodium: body.nutrition?.sodium ?? null,
      nutritionEstimated: body.nutrition?.estimated ?? false,
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

  // Estimate nutrition via AI if not provided by scraper
  if (!body.nutrition) {
    estimateNutrition(body.ingredients, body.servings ?? null).then(async (nutrition) => {
      if (nutrition) {
        await prisma.recipe.update({
          where: { id: recipeId },
          data: {
            nutritionCalories: nutrition.calories,
            nutritionFat: nutrition.fat,
            nutritionProtein: nutrition.protein,
            nutritionCarbs: nutrition.carbs,
            nutritionFiber: nutrition.fiber,
            nutritionSugar: nutrition.sugar,
            nutritionSodium: nutrition.sodium,
            nutritionEstimated: true,
          },
        });
      }
    }).catch(console.error);
  }

  return NextResponse.json(recipe, { status: 201 });
}

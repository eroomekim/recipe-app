import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { deleteRecipeImages } from "@/lib/storage";
import type { RecipeDetail } from "@/types";

export async function GET(
  _request: Request,
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
    include: {
      ingredients: { orderBy: { order: "asc" } },
      instructions: { orderBy: { order: "asc" } },
      substitutions: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.recipe.update({
    where: { id },
    data: { lastViewedAt: new Date() },
  });

  const result: RecipeDetail = {
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
    nutrition: recipe.nutritionCalories !== null || recipe.nutritionFat !== null
      ? {
          calories: recipe.nutritionCalories,
          fat: recipe.nutritionFat,
          protein: recipe.nutritionProtein,
          carbs: recipe.nutritionCarbs,
          fiber: recipe.nutritionFiber,
          sugar: recipe.nutritionSugar,
          sodium: recipe.nutritionSodium,
          estimated: recipe.nutritionEstimated,
        }
      : null,
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
      imageUrl: i.imageUrl,
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

  return NextResponse.json(result);
}

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
  if (body.images !== undefined) updateData.images = body.images;

  // Handle ingredients replacement
  if (body.ingredients !== undefined) {
    await prisma.ingredient.deleteMany({ where: { recipeId: id } });
    await prisma.ingredient.createMany({
      data: (body.ingredients as string[]).map((text: string, i: number) => ({
        recipeId: id,
        text,
        order: i,
      })),
    });
  }

  // Handle instructions replacement
  if (body.instructions !== undefined) {
    // Read existing instructions to preserve imageUrl when incoming data is plain strings.
    // Match by text content (not order index) to handle reordering/insertion gracefully.
    const existingInstructions = await prisma.instruction.findMany({
      where: { recipeId: id },
      select: { text: true, imageUrl: true },
    });
    const existingImageByText = new Map(
      existingInstructions
        .filter((inst) => inst.imageUrl)
        .map((inst) => [inst.text, inst.imageUrl])
    );

    await prisma.instruction.deleteMany({ where: { recipeId: id } });
    await prisma.instruction.createMany({
      data: (body.instructions as Array<string | { text: string; imageUrl?: string }>).map(
        (inst, i) => {
          const text = typeof inst === "string" ? inst : inst.text;
          // If the instruction is a plain string, preserve existing imageUrl matched by text
          const imageUrl = typeof inst === "string"
            ? (existingImageByText.get(text) ?? null)
            : (inst.imageUrl ?? null);
          return {
            recipeId: id,
            text,
            order: i,
            imageUrl,
          };
        }
      ),
    });
  }

  const updated = await prisma.recipe.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
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

  // Delete images from storage
  await deleteRecipeImages(user.id, id);

  // Delete recipe (cascades to ingredients, instructions, tags)
  await prisma.recipe.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

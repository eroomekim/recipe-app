import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth";
import { uploadRecipeImages } from "@/lib/storage";
import { createId } from "@paralleldrive/cuid2";
import type { CreateRecipeRequest, RecipeCardData } from "@/types";

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
      ingredients: {
        create: body.ingredients.map((text, i) => ({
          text,
          order: i,
        })),
      },
      instructions: {
        create: body.instructions.map((text, i) => ({
          text,
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

  return NextResponse.json(recipe, { status: 201 });
}

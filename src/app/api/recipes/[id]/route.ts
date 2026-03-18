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
      tags: { include: { tag: true } },
    },
  });

  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result: RecipeDetail = {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.sourceUrl,
    cookTime: recipe.cookTime,
    images: recipe.images,
    createdAt: recipe.createdAt.toISOString(),
    ingredients: recipe.ingredients.map((i) => ({
      id: i.id,
      text: i.text,
      order: i.order,
    })),
    instructions: recipe.instructions.map((i) => ({
      id: i.id,
      text: i.text,
      order: i.order,
    })),
    tags: recipe.tags.map((rt) => ({
      name: rt.tag.name,
      type: rt.tag.type,
    })),
  };

  return NextResponse.json(result);
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

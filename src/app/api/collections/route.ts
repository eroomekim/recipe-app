import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { CollectionData } from "@/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      recipes: {
        include: {
          recipe: { select: { images: true } },
        },
        take: 3,
      },
      _count: { select: { recipes: true } },
    },
  });

  const result: CollectionData[] = collections.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    recipeCount: c._count.recipes,
    previewImages: c.recipes.map((rc) => rc.recipe.images[0]).filter(Boolean),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const collection = await prisma.collection.create({
    data: { userId: user.id, name: name.trim(), description: description?.trim() || null },
  });

  return NextResponse.json(collection, { status: 201 });
}

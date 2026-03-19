import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeRuleBasedCollections } from "@/lib/smart-collections";
import { getAiCuratedCollections } from "@/lib/ai-collections";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      images: true,
      cookTime: true,
      isFavorite: true,
      lastViewedAt: true,
      _count: { select: { ingredients: true } },
      tags: { include: { tag: true } },
      ingredients: { select: { text: true }, take: 10 },
    },
  });

  const ruleBased = computeRuleBasedCollections(recipes);

  const aiRecipes = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    images: r.images,
    tags: r.tags.map((rt) => rt.tag.name),
    ingredients: r.ingredients.map((i) => i.text),
  }));
  const aiCurated = await getAiCuratedCollections(user.id, aiRecipes);

  return NextResponse.json([...aiCurated, ...ruleBased]);
}

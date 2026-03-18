import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import RecipeGrid from "@/components/recipes/RecipeGrid";
import Link from "next/link";
import type { RecipeCardData } from "@/types";

export default async function RecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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

  const recipeCards: RecipeCardData[] = recipes.map((r) => ({
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

  if (recipeCards.length === 0) {
    return (
      <main className="max-w-[1200px] mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center py-24">
          <h2 className="font-display text-3xl font-bold leading-none mb-4">
            Your recipe book is empty
          </h2>
          <p className="font-serif text-lg text-gray-600 mb-8">
            Start collecting recipes from your favorite food blogs.
          </p>
          <Link
            href="/import"
            className="bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors"
          >
            Import First Recipe
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="mb-8">
        <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600">
          {recipeCards.length} {recipeCards.length === 1 ? "Recipe" : "Recipes"}
        </span>
      </div>
      <RecipeGrid recipes={recipeCards} />
    </main>
  );
}

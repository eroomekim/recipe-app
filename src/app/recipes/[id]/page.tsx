import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import RecipePage from "@/components/recipes/RecipePage";
import DeleteRecipeButton from "@/components/recipes/DeleteRecipeButton";
import PrintRecipeButton from "@/components/recipes/PrintRecipeButton";
import Divider from "@/components/ui/Divider";
import type { RecipeDetail } from "@/types";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      instructions: { orderBy: { order: "asc" } },
      substitutions: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!recipe || recipe.userId !== user.id) notFound();

  // Update lastViewedAt
  await prisma.recipe.update({
    where: { id },
    data: { lastViewedAt: new Date() },
  });

  const recipeDetail: RecipeDetail = {
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

  return (
    <main className="max-w-article mx-auto pb-8">
      <RecipePage recipe={recipeDetail} />
      <Divider className="my-6" />
      <div className="flex items-center justify-between px-6">
        <DeleteRecipeButton recipeId={recipe.id} />
        <div className="flex gap-3">
          <PrintRecipeButton recipe={recipeDetail} />
          <Link
            href={`/recipes/${recipe.id}/edit`}
            className="bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors"
          >
            Edit Recipe
          </Link>
        </div>
      </div>
    </main>
  );
}

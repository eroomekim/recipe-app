import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import EditRecipeForm from "@/components/recipes/EditRecipeForm";

export default async function EditRecipePage({
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
      tags: { include: { tag: true } },
    },
  });

  if (!recipe || recipe.userId !== user.id) notFound();

  return (
    <main className="max-w-article mx-auto px-4 py-8">
      <EditRecipeForm
        recipeId={recipe.id}
        initialData={{
          title: recipe.title,
          ingredients: recipe.ingredients.map((i) => i.text),
          instructions: recipe.instructions.map((i) => i.text),
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          storageTips: recipe.storageTips,
          makeAheadNotes: recipe.makeAheadNotes,
          servingSuggestions: recipe.servingSuggestions,
          techniqueNotes: recipe.techniqueNotes,
          mealTypes: recipe.tags.filter((rt) => rt.tag.type === "MEAL_TYPE").map((rt) => rt.tag.name),
          cuisines: recipe.tags.filter((rt) => rt.tag.type === "CUISINE").map((rt) => rt.tag.name),
          dietary: recipe.tags.filter((rt) => rt.tag.type === "DIETARY").map((rt) => rt.tag.name),
        }}
      />
    </main>
  );
}

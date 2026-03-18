import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Divider from "@/components/ui/Divider";
import DeleteRecipeButton from "@/components/recipes/DeleteRecipeButton";

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
      tags: { include: { tag: true } },
    },
  });

  if (!recipe || recipe.userId !== user.id) notFound();

  const mealTypes = recipe.tags
    .filter((rt) => rt.tag.type === "MEAL_TYPE")
    .map((rt) => rt.tag.name);
  const cuisines = recipe.tags
    .filter((rt) => rt.tag.type === "CUISINE")
    .map((rt) => rt.tag.name);
  const heroImage = recipe.images[0];
  const additionalImages = recipe.images.slice(1);

  const tagParts = [
    ...mealTypes,
    ...cuisines,
    ...(recipe.cookTime ? [`${recipe.cookTime} min`] : []),
  ];

  return (
    <main className="max-w-[700px] mx-auto px-4 py-8">
      {/* Hero image */}
      {heroImage && (
        <div className="aspect-3/2 overflow-hidden bg-gray-50 mb-0">
          <img
            src={heroImage}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <Divider />

      {/* Tag row */}
      {tagParts.length > 0 && (
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
          {tagParts.join(" · ")}
        </p>
      )}

      {/* Title */}
      <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-none tracking-tighter text-black mb-2">
        {recipe.title}
      </h1>

      {/* Source link */}
      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs text-red hover:text-red-dark transition-colors"
        >
          View Original &rarr;
        </a>
      )}

      <Divider />

      {/* Ingredients and Instructions */}
      <div className="md:grid md:grid-cols-2 md:gap-12">
        {/* Ingredients */}
        <div className="mb-8 md:mb-0">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing) => (
              <li
                key={ing.id}
                className="font-serif text-base leading-relaxed text-black flex gap-2"
              >
                <span className="text-gray-500 select-none">&bull;</span>
                {ing.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4">
            Instructions
          </h2>
          <ol className="space-y-4">
            {recipe.instructions.map((inst, i) => (
              <li key={inst.id} className="flex gap-3">
                <span className="font-display text-xl font-black text-red/40 select-none shrink-0 w-8">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-serif text-base leading-relaxed text-black">
                  {inst.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Additional images */}
      {additionalImages.length > 0 && (
        <>
          <Divider />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {additionalImages.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden bg-gray-50">
                <img
                  src={src}
                  alt={`${recipe.title} - image ${i + 2}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <Divider />

      {/* Delete */}
      <div className="flex justify-end">
        <DeleteRecipeButton recipeId={recipe.id} />
      </div>
    </main>
  );
}

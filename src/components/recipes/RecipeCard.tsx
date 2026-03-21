import Link from "next/link";
import type { RecipeCardData } from "@/types";
import FavoriteButton from "./FavoriteButton";

export default function RecipeCard({
  recipe,
}: {
  recipe: RecipeCardData;
}) {
  const mealType = recipe.tags.find((t) => t.type === "MEAL_TYPE");
  const heroImage = recipe.images[0];
  const subtitle = recipe.firstInstruction
    ? recipe.firstInstruction.length > 60
      ? recipe.firstInstruction.slice(0, 60) + "..."
      : recipe.firstInstruction
    : null;

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <article className="group">
        {heroImage ? (
          <div className="relative aspect-3/2 overflow-hidden bg-gray-50">
            <img
              src={heroImage}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
            />
            <FavoriteButton
              recipeId={recipe.id}
              initialFavorite={recipe.isFavorite}
              className="absolute top-2 right-2 z-10"
            />
          </div>
        ) : (
          <div className="aspect-3/2 bg-gray-50 flex items-center justify-center">
            <span className="font-serif text-lg text-gray-500 italic">
              No image
            </span>
          </div>
        )}

        {mealType && (
          <span className="font-display text-sm font-normal text-red mt-3 block">
            {mealType.name}
          </span>
        )}

        <h2 className="font-display text-xl leading-none mt-1 group-hover:opacity-80 transition-opacity">
          {recipe.title}
        </h2>

        {subtitle && (
          <p className="font-serif text-base italic text-gray-600 mt-1">
            {subtitle}
          </p>
        )}

        <span className="font-sans text-xs text-gray-500 mt-2 block">
          {recipe.ingredientCount} ingredients &middot;{" "}
          {recipe.instructionCount} steps
        </span>
      </article>
    </Link>
  );
}

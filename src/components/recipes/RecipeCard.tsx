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


  return (
    <Link href={`/recipes/${recipe.id}`}>
      <article className="group">
        {heroImage ? (
          <div className="relative aspect-2/3 overflow-hidden bg-gray-50">
            <img
              src={heroImage}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
            />
            <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-black/40 to-transparent z-[1]" />
            <FavoriteButton
              recipeId={recipe.id}
              initialFavorite={recipe.isFavorite}
              className="absolute top-2 right-2 z-[2]"
            />
          </div>
        ) : (
          <div className="aspect-2/3 bg-gray-50 flex items-center justify-center">
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

<span className="font-sans text-xs text-gray-500 mt-2 block">
          {recipe.ingredientCount} ingredients &middot;{" "}
          {recipe.instructionCount} steps
          {recipe.cookTime ? <> &middot; {recipe.cookTime} min</> : null}
        </span>
      </article>
    </Link>
  );
}

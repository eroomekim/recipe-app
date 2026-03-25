import RecipeCard from "./RecipeCard";
import type { RecipeCardData } from "@/types";

export default function RecipeGrid({ recipes }: { recipes: RecipeCardData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}

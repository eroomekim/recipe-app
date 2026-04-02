import RecipeCard from "./RecipeCard";
import type { RecipeCardData } from "@/types";

export default function RecipeGrid({ recipes }: { recipes: RecipeCardData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {recipes.map((recipe, index) => (
        <div
          key={recipe.id}
          className="animate-card-in"
          style={{ "--stagger": `${Math.min(index * 60, 600)}ms` } as React.CSSProperties}
        >
          <RecipeCard recipe={recipe} />
        </div>
      ))}
    </div>
  );
}

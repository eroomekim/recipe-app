import RecipeCard from "./RecipeCard";
import type { RecipeCardData } from "@/types";

interface RecipeGridProps {
  recipes: RecipeCardData[];
  onCardClick?: (index: number) => void;
}

export default function RecipeGrid({ recipes, onCardClick }: RecipeGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
      {recipes.map((recipe, index) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onClick={onCardClick ? () => onCardClick(index) : undefined}
        />
      ))}
    </div>
  );
}

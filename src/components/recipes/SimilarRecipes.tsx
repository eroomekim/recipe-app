"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Divider from "@/components/ui/Divider";
import type { SimilarRecipe } from "@/types";
import { apiUrl } from "@/lib/api";

interface SimilarRecipesProps {
  recipeId: string;
}

export default function SimilarRecipes({ recipeId }: SimilarRecipesProps) {
  const [recipes, setRecipes] = useState<SimilarRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl(`/api/recipes/${recipeId}/similar?limit=5`))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecipes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [recipeId]);

  if (loading || recipes.length === 0) return null;

  return (
    <>
      <Divider className="my-6" />
      <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
        Similar Recipes
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide">
        {recipes.map((recipe) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="shrink-0 w-36 group"
          >
            <div className="aspect-3/2 overflow-hidden bg-gray-50 mb-2">
              {recipe.images[0] && (
                <img
                  src={recipe.images[0]}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
                />
              )}
            </div>
            <h3 className="font-display text-sm leading-tight font-bold text-black group-hover:opacity-80 transition-opacity line-clamp-2">
              {recipe.title}
            </h3>
            <span className="font-sans text-xs text-gray-500 mt-1 block">
              {recipe.sharedIngredientCount} shared ingredient{recipe.sharedIngredientCount !== 1 ? "s" : ""}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

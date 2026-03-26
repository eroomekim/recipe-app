"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SeasonalRecipe } from "@/types";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SeasonalShelf() {
  const [recipes, setRecipes] = useState<SeasonalRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recipes/seasonal")
      .then((r) => r.json())
      .then((data) => {
        setRecipes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || recipes.length === 0) return null;

  const monthName = MONTH_NAMES[new Date().getMonth() + 1];

  return (
    <div className="mb-8">
      <h2 className="font-display text-sm font-normal text-red tracking-normal mb-3">
        In Season — {monthName}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {recipes.map(({ recipe, seasonalIngredients }) => (
          <Link
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="shrink-0 w-44 group"
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
            {seasonalIngredients.length > 0 && (
              <p className="font-sans text-xs text-gray-500 mt-1 truncate">
                {seasonalIngredients.slice(0, 3).join(", ")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

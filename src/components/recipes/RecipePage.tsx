"use client";

import { useState } from "react";
import ImageCarousel from "./ImageCarousel";
import PersonalNotes from "./PersonalNotes";
import FavoriteButton from "./FavoriteButton";
import AddToCollectionButton from "./AddToCollectionButton";
import CookingMode from "@/components/cooking/CookingMode";
import Divider from "@/components/ui/Divider";
import type { RecipeDetail } from "@/types";

interface RecipePageProps {
  recipe: RecipeDetail;
  pageIndex?: number;
  totalPages?: number;
  onClose?: () => void;
}

export default function RecipePage({
  recipe,
  pageIndex,
  totalPages,
  onClose,
}: RecipePageProps) {
  const [cooking, setCooking] = useState(false);

  const mealTypes = recipe.tags
    .filter((t) => t.type === "MEAL_TYPE")
    .map((t) => t.name);
  const cuisines = recipe.tags
    .filter((t) => t.type === "CUISINE")
    .map((t) => t.name);
  const heroImages = recipe.images.slice(0, 4);
  const additionalImages = recipe.images.slice(4);

  const rubricParts = [...mealTypes, ...cuisines].filter(Boolean);

  if (cooking) {
    return <CookingMode recipe={recipe} onExit={() => setCooking(false)} />;
  }

  return (
    <div className="bg-white max-w-article mx-auto">
      {/* Hero Image */}
      <div className="relative w-full h-[50vh] md:h-[65vh]">
        <ImageCarousel
          images={heroImages}
          alt={recipe.title}
          className="w-full h-full"
          overlay
        />

        {/* Page indicator */}
        {pageIndex !== undefined && totalPages !== undefined && (
          <div className="absolute top-4 left-5 font-sans text-xs font-semibold tracking-wider text-white/70 uppercase">
            {pageIndex + 1} / {totalPages}
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-5 text-white/70 hover:text-white text-xl transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        )}

        {/* Favorite */}
        <FavoriteButton
          recipeId={recipe.id}
          initialFavorite={recipe.isFavorite}
          className="absolute top-4 right-14 text-white"
        />

        {/* Title overlay */}
        <div className="absolute bottom-5 left-6 right-6">
          {rubricParts.length > 0 && (
            <div className="font-display text-sm font-normal text-white/70 tracking-normal mb-2">
              {rubricParts.join(" · ").toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-2xl md:text-5xl font-black leading-none text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            {recipe.title}
          </h1>
        </div>
      </div>

      {/* Content below hero */}
      <div className="px-6 py-5">
        {/* Tags row */}
        <div className="flex gap-2 flex-wrap items-center">
          {recipe.cookTime && (
            <span className="font-sans text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1">
              {recipe.cookTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="font-sans text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1">
              {recipe.servings} servings
            </span>
          )}
          {recipe.tags
            .filter((t) => t.type === "DIETARY")
            .map((t) => (
              <span
                key={t.name}
                className="font-sans text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-2.5 py-1"
              >
                {t.name}
              </span>
            ))}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-xs font-semibold text-red hover:text-red-dark transition-colors ml-auto"
            >
              View Original &rarr;
            </a>
          )}
          <AddToCollectionButton recipeId={recipe.id} />
          <button
            onClick={() => setCooking(true)}
            className="bg-black text-white font-sans text-xs font-semibold uppercase tracking-wider px-4 py-1.5 hover:bg-gray-900 transition-colors"
          >
            Start Cooking
          </button>
        </div>

        {/* Personal notes */}
        <PersonalNotes
          recipeId={recipe.id}
          initialNotes={recipe.personalNotes}
          initialAdaptations={recipe.personalAdaptations}
        />

        <Divider className="my-5" />

        {/* Ingredients & Instructions */}
        <div className="md:grid md:grid-cols-[1fr_1.4fr] md:gap-0">
          {/* Ingredients */}
          <div className="md:pr-5 md:border-r md:border-gray-200 mb-6 md:mb-0">
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Ingredients
            </h2>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing) => (
                <li
                  key={ing.id}
                  className="font-serif text-sm leading-relaxed text-black"
                >
                  {ing.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="md:pl-5">
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Instructions
            </h2>
            <ol className="space-y-3">
              {recipe.instructions.map((inst, i) => (
                <li key={inst.id} className="flex gap-3">
                  <span className="font-display text-xl font-black text-red/40 select-none shrink-0 w-7">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-serif text-sm leading-relaxed text-black">
                    {inst.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Substitutions */}
        {recipe.substitutions.length > 0 && (
          <>
            <Divider className="my-5" />
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Substitutions
            </h2>
            <div className="space-y-1.5">
              {recipe.substitutions.map((sub) => (
                <div key={sub.id} className="font-serif text-sm leading-relaxed text-gray-600">
                  <strong className="text-black">{sub.ingredient} →</strong>{" "}
                  {sub.substitute}
                  {sub.notes && (
                    <span className="text-gray-500"> ({sub.notes})</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Supplementary notes */}
        {(recipe.storageTips || recipe.makeAheadNotes || recipe.servingSuggestions || recipe.techniqueNotes) && (
          <>
            <Divider className="my-5" />
            <div className="space-y-4">
              {recipe.storageTips && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Storage</h3>
                  <div className="font-serif text-sm leading-relaxed text-gray-600 prose-sm" dangerouslySetInnerHTML={{ __html: recipe.storageTips }} />
                </div>
              )}
              {recipe.makeAheadNotes && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Make Ahead</h3>
                  <div className="font-serif text-sm leading-relaxed text-gray-600 prose-sm" dangerouslySetInnerHTML={{ __html: recipe.makeAheadNotes }} />
                </div>
              )}
              {recipe.servingSuggestions && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Serving Suggestions</h3>
                  <div className="font-serif text-sm leading-relaxed text-gray-600 prose-sm" dangerouslySetInnerHTML={{ __html: recipe.servingSuggestions }} />
                </div>
              )}
              {recipe.techniqueNotes && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Tips</h3>
                  <div className="font-serif text-sm leading-relaxed text-gray-600 prose-sm" dangerouslySetInnerHTML={{ __html: recipe.techniqueNotes }} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Additional images */}
        {additionalImages.length > 0 && (
          <>
            <Divider className="my-5" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {additionalImages.map((src, i) => (
                <div key={i} className="aspect-square overflow-hidden bg-gray-50">
                  <img
                    src={src}
                    alt={`${recipe.title} - image ${i + 5}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

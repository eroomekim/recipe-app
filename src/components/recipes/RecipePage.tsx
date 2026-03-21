"use client";

import { useState } from "react";
import ImageCarousel from "./ImageCarousel";
import PersonalNotes from "./PersonalNotes";
import FavoriteButton from "./FavoriteButton";
import AddToCollectionButton from "./AddToCollectionButton";
import CookingMode from "@/components/cooking/CookingMode";
import Divider from "@/components/ui/Divider";
import ImageLightbox from "./ImageLightbox";
import { X, ExternalLink, ChefHat } from "lucide-react";
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mealTypes = recipe.tags
    .filter((t) => t.type === "MEAL_TYPE")
    .map((t) => t.name);
  const cuisines = recipe.tags
    .filter((t) => t.type === "CUISINE")
    .map((t) => t.name);
  const heroImages = recipe.images.slice(0, 4);
  const additionalImages = recipe.images.slice(4);

  const rubricParts = [...mealTypes, ...cuisines].filter(Boolean);
  const dietaryTags = recipe.tags.filter((t) => t.type === "DIETARY");

  if (cooking) {
    return <CookingMode recipe={recipe} onExit={() => setCooking(false)} />;
  }

  return (
    <div className="bg-white max-w-article mx-auto">
      {/* Hero Image — full bleed, no text overlay */}
      <div className="relative w-full aspect-3/2 md:aspect-auto md:h-[55vh]">
        <ImageCarousel
          images={heroImages}
          alt={recipe.title}
          className="w-full h-full"
        />

        {/* Page indicator */}
        {pageIndex !== undefined && totalPages !== undefined && (
          <div className="absolute top-4 left-5 bg-black/40 backdrop-blur-sm text-white font-sans text-xs font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full">
            {pageIndex + 1} / {totalPages}
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-5 w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content below image */}
      <div className="px-5 py-6">
        {/* Rubric */}
        {rubricParts.length > 0 && (
          <div className="font-display text-sm font-normal text-red tracking-normal mb-1">
            {rubricParts.join(" · ")}
          </div>
        )}

        {/* Title */}
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black leading-none tracking-tighter text-black mb-2">
          {recipe.title}
        </h1>

        {/* Source attribution */}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-xs text-gray-500 hover:text-black transition-colors inline-flex items-center gap-1 mb-4"
          >
            View Original <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Stats row */}
        {(recipe.cookTime || recipe.servings) && (
          <div className="flex items-start gap-0 mt-4 mb-5">
            {recipe.cookTime && (
              <div className="pr-5">
                <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">Cook Time</div>
                <div className="font-sans text-lg font-bold text-black mt-0.5">{recipe.cookTime} mins</div>
              </div>
            )}
            {recipe.cookTime && recipe.servings && (
              <div className="w-px h-10 bg-gray-300 self-center" />
            )}
            {recipe.servings && (
              <div className="px-5">
                <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">Yield</div>
                <div className="font-sans text-lg font-bold text-black mt-0.5">{recipe.servings}</div>
              </div>
            )}
            {(recipe.cookTime || recipe.servings) && dietaryTags.length > 0 && (
              <div className="w-px h-10 bg-gray-300 self-center" />
            )}
            {dietaryTags.length > 0 && (
              <div className="px-5">
                <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">Dietary</div>
                <div className="font-sans text-sm font-bold text-black mt-1">
                  {dietaryTags.map((t) => t.name).join(", ")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setCooking(true)}
            className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChefHat className="w-5 h-5 text-gray-600" />
            <span className="font-sans text-xs font-semibold text-gray-600">Cook</span>
          </button>
          <div className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-gray-50 rounded-xl">
            <FavoriteButton
              recipeId={recipe.id}
              initialFavorite={recipe.isFavorite}
              className="text-gray-600"
            />
            <span className="font-sans text-xs font-semibold text-gray-600">Favorite</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1.5 py-3 bg-gray-50 rounded-xl">
            <AddToCollectionButton recipeId={recipe.id} />
          </div>
        </div>

        {/* Personal notes */}
        <PersonalNotes
          recipeId={recipe.id}
          initialNotes={recipe.personalNotes}
          initialAdaptations={recipe.personalAdaptations}
        />

        <Divider className="my-6" />

        {/* Ingredients */}
        <div className="mb-8">
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
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

        <Divider className="my-6" />

        {/* Instructions */}
        <div className="mb-4">
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
            Instructions
          </h2>
          <ol className="space-y-5">
            {recipe.instructions.map((inst, i) => (
              <li key={inst.id} className="flex gap-4">
                <span className="font-display text-xl font-black text-red/40 select-none shrink-0 w-7 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-serif text-base leading-relaxed text-black">
                  {inst.text}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* Substitutions */}
        {recipe.substitutions.length > 0 && (
          <>
            <Divider className="my-6" />
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Substitutions
            </h2>
            <div className="space-y-2">
              {recipe.substitutions.map((sub) => (
                <div key={sub.id} className="font-serif text-base leading-relaxed text-gray-600">
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
            <Divider className="my-6" />
            <div className="space-y-5">
              {recipe.storageTips && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Storage</h3>
                  <div className="font-serif text-base leading-relaxed text-gray-600 prose-content" dangerouslySetInnerHTML={{ __html: recipe.storageTips }} />
                </div>
              )}
              {recipe.makeAheadNotes && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Make Ahead</h3>
                  <div className="font-serif text-base leading-relaxed text-gray-600 prose-content" dangerouslySetInnerHTML={{ __html: recipe.makeAheadNotes }} />
                </div>
              )}
              {recipe.servingSuggestions && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Serving Suggestions</h3>
                  <div className="font-serif text-base leading-relaxed text-gray-600 prose-content" dangerouslySetInnerHTML={{ __html: recipe.servingSuggestions }} />
                </div>
              )}
              {recipe.techniqueNotes && (
                <div>
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Tips</h3>
                  <div className="font-serif text-base leading-relaxed text-gray-600 prose-content" dangerouslySetInnerHTML={{ __html: recipe.techniqueNotes }} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Additional images — tap to open lightbox */}
        {additionalImages.length > 0 && (
          <>
            <Divider className="my-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {additionalImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIndex(i)}
                  className="aspect-square overflow-hidden bg-gray-50 rounded-lg cursor-pointer group"
                >
                  <img
                    src={src}
                    alt={`${recipe.title} - image ${i + 5}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Image lightbox */}
        {lightboxIndex !== null && (
          <ImageLightbox
            images={additionalImages}
            initialIndex={lightboxIndex}
            alt={recipe.title}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    </div>
  );
}

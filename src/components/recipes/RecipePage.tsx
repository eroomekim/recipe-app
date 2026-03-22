"use client";

import { useState, useMemo } from "react";
import ImageCarousel from "./ImageCarousel";
import PersonalNotes from "./PersonalNotes";
import FavoriteButton from "./FavoriteButton";
import AddToCollectionButton from "./AddToCollectionButton";
import AddToGroceryButton from "./AddToGroceryButton";
import CookingMode from "@/components/cooking/CookingMode";
import Divider from "@/components/ui/Divider";
import ImageLightbox from "./ImageLightbox";
import NutritionCard from "./NutritionCard";
import { X, ExternalLink, CookingPot, Minus, Plus, Square, CheckSquare, ShoppingCart, Check } from "lucide-react";
import { scaleIngredient } from "@/lib/ingredient-scaler";
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
  const [scaleFactor, setScaleFactor] = useState(1);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [groceryAdded, setGroceryAdded] = useState(false);

  const currentServings = recipe.servings
    ? Math.round(recipe.servings * scaleFactor)
    : null;

  const scaledIngredients = useMemo(() => {
    return recipe.ingredients.map((ing) =>
      scaleIngredient(
        { text: ing.text, quantity: ing.quantity, unit: ing.unit, name: ing.name },
        scaleFactor
      )
    );
  }, [recipe.ingredients, scaleFactor]);

  const allImages = useMemo(() => {
    const stepImages = recipe.instructions
      .filter((inst) => inst.imageUrl)
      .map((inst) => inst.imageUrl!);
    return [...recipe.images, ...stepImages];
  }, [recipe.images, recipe.instructions]);

  const mealTypes = recipe.tags
    .filter((t) => t.type === "MEAL_TYPE")
    .map((t) => t.name);
  const cuisines = recipe.tags
    .filter((t) => t.type === "CUISINE")
    .map((t) => t.name);
  const heroImage = recipe.images[0];
  const additionalImages = recipe.images.slice(1);

  const rubricParts = [...mealTypes, ...cuisines].filter(Boolean);
  const dietaryTags = recipe.tags.filter((t) => t.type === "DIETARY");

  if (cooking) {
    return <CookingMode recipe={recipe} onExit={() => setCooking(false)} />;
  }

  return (
    <div className="bg-white max-w-article mx-auto">
      {/* Hero Image — full bleed, tap to open lightbox */}
      <div
        className="relative w-full aspect-3/2 md:aspect-auto md:h-[55vh] cursor-pointer bg-gray-50"
        onClick={() => setLightboxIndex(0)}
      >
        {heroImage && (
          <img
            src={heroImage}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        )}

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
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    onClick={() => setScaleFactor((s) => Math.max(0.25, s - 0.25))}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="Decrease servings"
                  >
                    <Minus className="w-3 h-3 text-gray-600" />
                  </button>
                  <span className="font-sans text-lg font-bold text-black min-w-[1.5rem] text-center">
                    {currentServings}
                  </span>
                  <button
                    onClick={() => setScaleFactor((s) => s + 0.25)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="Increase servings"
                  >
                    <Plus className="w-3 h-3 text-gray-600" />
                  </button>
                  {scaleFactor !== 1 && (
                    <button
                      onClick={() => setScaleFactor(1)}
                      className="font-sans text-xs text-gray-400 hover:text-black transition-colors ml-1"
                    >
                      reset
                    </button>
                  )}
                </div>
              </div>
            )}
            {(recipe.cookTime || recipe.servings) && dietaryTags.length > 0 && (
              <div className="w-px h-10 bg-gray-300 self-center" />
            )}
            {dietaryTags.length > 0 && (
              <div className="px-5">
                <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">Dietary</div>
                <div className="font-sans text-lg font-bold text-black mt-0.5">
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
            className="flex items-center gap-2 px-4 py-2.5 border border-black text-black font-sans text-xs font-semibold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
          >
            <CookingPot className="w-4 h-4" strokeWidth={1.5} />
            Cook
          </button>
          <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 font-sans text-xs font-semibold uppercase tracking-wider hover:border-black transition-colors">
            <FavoriteButton
              recipeId={recipe.id}
              initialFavorite={recipe.isFavorite}
              className="text-gray-900"
            />
            Favorite
          </div>
          <a
            href="/grocery"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-black font-sans text-xs font-semibold uppercase tracking-wider hover:border-black transition-colors"
          >
            <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
            Groceries
          </a>
          <div className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 font-sans text-xs font-semibold uppercase tracking-wider hover:border-black transition-colors">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500">
              Ingredients
            </h2>
            <div className="flex items-center gap-3">
              {scaleFactor !== 1 && (
                <span className="font-sans text-xs text-gray-400">
                  scaled to {currentServings} servings
                </span>
              )}
              {selectedIngredients.size > 0 && (
                <button
                  onClick={async () => {
                    const items = Array.from(selectedIngredients).map((i) => ({
                      text: scaledIngredients[i].scaledText,
                      recipeId: recipe.id,
                      recipeTitle: recipe.title,
                    }));
                    const res = await fetch("/api/grocery", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ items }),
                    });
                    if (res.ok) {
                      setGroceryAdded(true);
                      setSelectedIngredients(new Set());
                      setTimeout(() => setGroceryAdded(false), 3000);
                    }
                  }}
                  className="flex items-center gap-1 font-sans text-xs font-semibold text-black hover:text-gray-600 transition-colors"
                >
                  {groceryAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-green-600">Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add {selectedIngredients.size} to grocery
                    </>
                  )}
                </button>
              )}
              {!groceryAdded && (
                <button
                  onClick={() => {
                    if (selectedIngredients.size === scaledIngredients.length) {
                      setSelectedIngredients(new Set());
                    } else {
                      setSelectedIngredients(new Set(scaledIngredients.map((_, i) => i)));
                    }
                  }}
                  className="font-sans text-xs text-gray-400 hover:text-black transition-colors"
                >
                  {selectedIngredients.size === scaledIngredients.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
          </div>
          <ul className="space-y-1">
            {scaledIngredients.map((ing, i) => {
              const isSelected = selectedIngredients.has(i);
              return (
                <li
                  key={recipe.ingredients[i].id}
                  onClick={() => {
                    const next = new Set(selectedIngredients);
                    if (isSelected) next.delete(i);
                    else next.add(i);
                    setSelectedIngredients(next);
                  }}
                  className={`font-serif text-base leading-relaxed flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? "bg-gray-50 text-black" : "text-black hover:bg-gray-50"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4.5 h-4.5 text-black shrink-0 mt-1" />
                  ) : (
                    <Square className="w-4.5 h-4.5 text-gray-300 shrink-0 mt-1" />
                  )}
                  {ing.scaledText}
                </li>
              );
            })}
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
              <li key={inst.id} className="flex flex-col">
                <div className="flex gap-4">
                  <span className="font-display text-xl font-black text-red/40 select-none shrink-0 w-7 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-serif text-base leading-relaxed text-black">
                    {inst.text}
                  </p>
                </div>
                {inst.imageUrl && (
                  <div className="ml-11 mt-3">
                    <img
                      src={inst.imageUrl}
                      alt={`Step ${i + 1}`}
                      loading="lazy"
                      className="w-full aspect-video object-cover cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => {
                        const idx = allImages.indexOf(inst.imageUrl!);
                        setLightboxIndex(idx >= 0 ? idx : 0);
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Nutrition */}
        {recipe.nutrition && (
          <>
            <Divider className="my-6" />
            <NutritionCard nutrition={recipe.nutrition} />
          </>
        )}

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
                  onClick={() => setLightboxIndex(i + 1)}
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

        {/* Image lightbox — all images, tapped index */}
        {lightboxIndex !== null && (
          <ImageLightbox
            images={allImages}
            initialIndex={lightboxIndex}
            alt={recipe.title}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    </div>
  );
}

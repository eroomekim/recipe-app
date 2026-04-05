"use client";

import { X } from "lucide-react";
import type { ScaledIngredient } from "@/types";

interface IngredientDrawerProps {
  ingredients: ScaledIngredient[];
  onToggle: (index: number) => void;
  scaleFactor: number;
  originalServings: number | null;
  onScaleChange: (factor: number) => void;
  expanded: boolean;
  onClose: () => void;
}

export default function IngredientDrawer({
  ingredients,
  onToggle,
  scaleFactor,
  originalServings,
  onScaleChange,
  expanded,
  onClose,
}: IngredientDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}

        {/* Drawer — slides up */}
        <div
          className={`bg-gray-50 border-t border-black/10 max-h-[60vh] overflow-y-auto transition-transform duration-300 ease-out-expo ${
            expanded ? "translate-y-0" : "translate-y-full"
          }`}
          aria-hidden={!expanded}
        >
          {/* Drawer header */}
          <div className="sticky top-0 bg-gray-50 flex items-center justify-between px-6 py-4 border-b border-black/10">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-black/50">
              Ingredients
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-black/40 hover:text-black transition-colors"
              aria-label="Close ingredients"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4">
            {/* Scale controls */}
            {originalServings && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-black/10">
                <span className="font-sans text-xs font-semibold uppercase tracking-wider text-black/50">
                  Servings
                </span>
                <button
                  onClick={() => onScaleChange(Math.max(0.5, scaleFactor - 0.5))}
                  className="w-8 h-8 flex items-center justify-center bg-black/10 text-black rounded-full hover:bg-black/20 transition-colors"
                >
                  −
                </button>
                <span className="font-sans text-base font-bold tabular-nums min-w-[2rem] text-center">
                  {Math.round(originalServings * scaleFactor)}
                </span>
                <button
                  onClick={() => onScaleChange(scaleFactor + 0.5)}
                  className="w-8 h-8 flex items-center justify-center bg-black/10 text-black rounded-full hover:bg-black/20 transition-colors"
                >
                  +
                </button>
                {scaleFactor !== 1 && (
                  <button
                    onClick={() => onScaleChange(1)}
                    className="font-sans text-xs text-black/40 hover:text-black ml-2 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            {/* Ingredients list */}
            <ul className="space-y-2">
              {ingredients.map((ing, i) => (
                <li
                  key={i}
                  onClick={() => onToggle(i)}
                  className={`font-serif text-base cursor-pointer transition-colors ${
                    ing.checked ? "text-black/30 line-through" : "text-black"
                  }`}
                >
                  {ing.scaledText}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

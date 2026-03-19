"use client";

import { useState } from "react";
import type { ScaledIngredient } from "@/types";

interface IngredientDrawerProps {
  ingredients: ScaledIngredient[];
  onToggle: (index: number) => void;
  scaleFactor: number;
  originalServings: number | null;
  onScaleChange: (factor: number) => void;
}

export default function IngredientDrawer({
  ingredients,
  onToggle,
  scaleFactor,
  originalServings,
  onScaleChange,
}: IngredientDrawerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Handle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gray-900 border-t border-white/10 py-2 flex items-center justify-center"
      >
        <div className="w-10 h-1 bg-white/30 rounded-full" />
      </button>

      {/* Drawer content */}
      {expanded && (
        <div className="bg-gray-900 border-t border-white/10 max-h-[50vh] overflow-y-auto px-6 py-4">
          {/* Scale controls */}
          {originalServings && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <span className="font-sans text-xs font-semibold uppercase tracking-wider text-white/50">
                Servings
              </span>
              <button
                onClick={() => onScaleChange(Math.max(0.5, scaleFactor - 0.5))}
                className="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
              >
                −
              </button>
              <span className="font-sans text-base font-bold text-white tabular-nums min-w-[2rem] text-center">
                {Math.round(originalServings * scaleFactor)}
              </span>
              <button
                onClick={() => onScaleChange(scaleFactor + 0.5)}
                className="w-8 h-8 flex items-center justify-center bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
              >
                +
              </button>
              {scaleFactor !== 1 && (
                <button
                  onClick={() => onScaleChange(1)}
                  className="font-sans text-xs text-white/40 hover:text-white ml-2 transition-colors"
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
                  ing.checked ? "text-white/30 line-through" : "text-white"
                }`}
              >
                {ing.scaledText}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

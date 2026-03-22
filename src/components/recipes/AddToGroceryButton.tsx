"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import type { ScaledResult } from "@/lib/ingredient-scaler";

interface AddToGroceryButtonProps {
  recipeId: string;
  recipeTitle: string;
  ingredients: ScaledResult[];
}

export default function AddToGroceryButton({
  recipeId,
  recipeTitle,
  ingredients,
}: AddToGroceryButtonProps) {
  const [added, setAdded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (saving || added) return;
    setSaving(true);

    try {
      const res = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: ingredients.map((ing) => ({
            text: ing.scaledText,
            recipeId,
            recipeTitle,
          })),
        }),
      });

      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleAdd}
      disabled={saving}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
        added
          ? "bg-green-50 text-green-600"
          : "bg-gray-50 hover:bg-gray-100 text-gray-600"
      }`}
    >
      {added ? (
        <Check className="w-5 h-5" />
      ) : (
        <ShoppingCart className="w-5 h-5" />
      )}
      <span className="font-sans text-xs font-semibold">
        {added ? "Added!" : "Grocery"}
      </span>
    </button>
  );
}

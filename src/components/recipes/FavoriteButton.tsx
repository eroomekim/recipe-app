"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorite: boolean;
  className?: string;
}

export default function FavoriteButton({
  recipeId,
  initialFavorite,
  className = "",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;
    setSaving(true);

    const newValue = !isFavorite;
    setIsFavorite(newValue);

    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });

      if (!res.ok) {
        setIsFavorite(!newValue);
      }
    } catch {
      setIsFavorite(!newValue);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={`transition-colors ${className}`}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`w-5 h-5 ${isFavorite ? "text-red fill-current" : "text-current"}`}
        strokeWidth={isFavorite ? 0 : 1.5}
      />
    </button>
  );
}

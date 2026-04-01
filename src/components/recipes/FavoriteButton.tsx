"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorite: boolean;
  className?: string;
  variant?: "overlay" | "inline";
}

export default function FavoriteButton({
  recipeId,
  initialFavorite,
  className = "",
  variant = "overlay",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (saving) return;
    setSaving(true);

    const newValue = !isFavorite;
    setIsFavorite(newValue);

    try {
      const res = await fetch(apiUrl(`/api/recipes/${recipeId}`), {
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

  const heartClass = isFavorite
    ? "text-red fill-current"
    : variant === "overlay"
      ? "text-white fill-white opacity-75 group-hover/fav:opacity-100"
      : "text-current";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={`group/fav transition-colors ${className}`}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`w-5 h-5 ${heartClass} transition-opacity`}
        strokeWidth={isFavorite ? 0 : variant === "overlay" ? 0 : 1.5}
      />
    </button>
  );
}

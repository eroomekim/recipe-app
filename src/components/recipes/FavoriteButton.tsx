"use client";

import { useState } from "react";

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={isFavorite ? 0 : 1.5}
        className={`w-5 h-5 ${isFavorite ? "text-red" : "text-gray-500 hover:text-gray-900"}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}

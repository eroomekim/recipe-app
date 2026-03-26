"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RecipePage from "./RecipePage";
import type { RecipeDetail } from "@/types";
import { apiUrl } from "@/lib/api";

interface RecipeBookletProps {
  recipeIds: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function RecipeBooklet({
  recipeIds,
  initialIndex,
  onClose,
}: RecipeBookletProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const fetchRecipe = useCallback(async (index: number) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/recipes/${recipeIds[index]}`));
      if (res.ok) {
        const data = await res.json();
        setRecipe(data);
      }
    } finally {
      setLoading(false);
    }
  }, [recipeIds]);

  useEffect(() => {
    fetchRecipe(currentIndex);
  }, [currentIndex, fetchRecipe]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < recipeIds.length - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, recipeIds.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-[92vw] max-w-article bg-white mx-auto rounded-[8px] overflow-hidden animate-slideUp"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <div className="flex items-center justify-center h-[70vh]">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recipe ? (
          <RecipePage
            recipe={recipe}
            pageIndex={currentIndex}
            totalPages={recipeIds.length}
            onClose={onClose}
          />
        ) : (
          <div className="flex items-center justify-center h-[70vh]">
            <p className="font-sans text-sm text-gray-500">Recipe not found</p>
          </div>
        )}
      </div>

      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-black transition-colors rounded-full"
          aria-label="Previous recipe"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {currentIndex < recipeIds.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white text-black transition-colors rounded-full"
          aria-label="Next recipe"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

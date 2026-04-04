"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import CookingStep from "./CookingStep";
import IngredientDrawer from "./IngredientDrawer";
import VoiceControl from "./VoiceControl";
import { useWakeLock } from "@/hooks/useWakeLock";
import { scaleIngredient } from "@/lib/ingredient-scaler";
import { convertTemperatureInText } from "@/lib/unit-converter";
import type { RecipeDetail, ScaledIngredient } from "@/types";

interface CookingModeProps {
  recipe: RecipeDetail;
  onExit: () => void;
  defaultAutoReadAloud?: boolean;
  defaultKeepAwake?: boolean;
  measurementSystem?: "imperial" | "metric";
}

export default function CookingMode({ recipe, onExit, defaultAutoReadAloud = false, defaultKeepAwake = true, measurementSystem = "imperial" }: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [guidedMode, setGuidedMode] = useState(false);
  const [autoReadAloud, setAutoReadAloud] = useState(defaultAutoReadAloud);
  const wakeLock = useWakeLock();

  // Request wake lock on mount (if enabled)
  useEffect(() => {
    if (defaultKeepAwake) wakeLock.request();
    return () => { wakeLock.release(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setCurrentStep((s) => Math.min(s + 1, recipe.instructions.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentStep((s) => Math.max(s - 1, 0));
      } else if (e.key === "Escape") {
        onExit();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [recipe.instructions.length, onExit]);

  // Auto read-aloud on step change (guided mode)
  useEffect(() => {
    if (autoReadAloud && guidedMode && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(convertTemperatureInText(recipe.instructions[currentStep].text, measurementSystem));
      window.speechSynthesis.speak(utterance);
    }
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [currentStep, autoReadAloud, guidedMode, recipe.instructions, measurementSystem]);

  // Scaled ingredients
  const scaledIngredients: ScaledIngredient[] = useMemo(() => {
    return recipe.ingredients.map((ing, i) => {
      const scaled = scaleIngredient(
        { text: ing.text, quantity: ing.quantity, unit: ing.unit, name: ing.name },
        scaleFactor
      );
      return {
        ...scaled,
        checked: checkedIngredients.has(i),
      };
    });
  }, [recipe.ingredients, scaleFactor, checkedIngredients]);

  const toggleIngredient = useCallback((index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleVoiceCommand = useCallback((command: "next" | "previous" | "repeat" | "ingredients") => {
    if (command === "next") setCurrentStep((s) => Math.min(s + 1, recipe.instructions.length - 1));
    else if (command === "previous") setCurrentStep((s) => Math.max(s - 1, 0));
    else if (command === "repeat") {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(convertTemperatureInText(recipe.instructions[currentStep].text, measurementSystem));
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [currentStep, recipe.instructions, measurementSystem]);

  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, recipe.instructions.length - 1));

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Only trigger if horizontal swipe is dominant and > 50px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();  // swipe left = next
      else goPrev();             // swipe right = prev
    }
    // Swipe down to exit (> 100px)
    if (deltaY > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
      onExit();
    }
  }, [goNext, goPrev, onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-white text-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
        <h1 className="font-display text-base font-bold truncate max-w-[60%]">
          {recipe.title}
        </h1>
        <div className="flex items-center gap-4">
          {guidedMode && (
            <>
              <VoiceControl enabled={guidedMode} onCommand={handleVoiceCommand} />
              <button
                onClick={() => setAutoReadAloud(!autoReadAloud)}
                className={`font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                  autoReadAloud ? "text-black" : "text-black/30 hover:text-black/60"
                }`}
              >
                {autoReadAloud ? "Read ●" : "Read"}
              </button>
            </>
          )}
          <button
            onClick={() => setGuidedMode(!guidedMode)}
            className={`font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
              guidedMode ? "text-red" : "text-black/50 hover:text-black"
            }`}
          >
            {guidedMode ? "Guided On" : "Guided"}
          </button>
          <button
            onClick={onExit}
            className="font-sans text-xs font-semibold uppercase tracking-wider text-black/50 hover:text-black transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Step content — large tap zones + swipe */}
      <div
        className="flex-1 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <CookingStep
          stepNumber={currentStep + 1}
          totalSteps={recipe.instructions.length}
          text={recipe.instructions[currentStep].text}
          measurementSystem={measurementSystem}
        />

        {/* Left tap zone */}
        {currentStep > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-0 top-0 bottom-0 w-1/3"
            aria-label="Previous step"
          />
        )}

        {/* Right tap zone */}
        {currentStep < recipe.instructions.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-0 top-0 bottom-0 w-1/3"
            aria-label="Next step"
          />
        )}

        {/* Visible nav arrows */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-between px-6">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="font-sans text-sm text-black/40 disabled:invisible hover:text-black transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={goNext}
            disabled={currentStep === recipe.instructions.length - 1}
            className="font-sans text-sm text-black/40 disabled:invisible hover:text-black transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Ingredient drawer */}
      <IngredientDrawer
        ingredients={scaledIngredients}
        onToggle={toggleIngredient}
        scaleFactor={scaleFactor}
        originalServings={recipe.servings}
        onScaleChange={setScaleFactor}
      />
    </div>
  );
}

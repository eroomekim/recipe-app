"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TagSelector from "@/components/ui/TagSelector";
import Spinner from "@/components/ui/Spinner";
import Divider from "@/components/ui/Divider";
import type { ExtractedRecipe } from "@/types";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Appetizer"];
const CUISINES = [
  "Italian", "Mexican", "Thai", "Japanese", "Indian", "French",
  "American", "Mediterranean", "Chinese", "Korean", "Vietnamese",
  "Middle Eastern", "Greek", "Other",
];
const DIETARY = [
  "Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free",
  "Keto", "Paleo", "Nut-Free", "Low-Carb",
];

export default function ImportForm() {
  const router = useRouter();

  // Step 1 state
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Step 2 state
  const [extracted, setExtracted] = useState<ExtractedRecipe | null>(null);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [mealTypes, setMealTypes] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setExtractError(null);
    setExtracting(true);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setExtractError(data.error || "Extraction failed");
        return;
      }

      const recipe = data as ExtractedRecipe;
      setExtracted(recipe);
      setTitle(recipe.title);
      setIngredients(recipe.ingredients.join("\n"));
      setInstructions(recipe.instructions.join("\n"));
      setCookTime(recipe.suggestedCookTimeMinutes?.toString() ?? "");
      setImages(recipe.images);
      setMealTypes(recipe.suggestedMealTypes);
      setCuisines(recipe.suggestedCuisines);
      setDietary(recipe.suggestedDietary);
    } catch {
      setExtractError("Failed to connect to server");
    } finally {
      setExtracting(false);
    }
  }

  function handleToggle(
    list: string[],
    setList: (v: string[]) => void,
    value: string
  ) {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  function handleBack() {
    setExtracted(null);
    setExtractError(null);
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sourceUrl: url,
          cookTime: cookTime ? parseInt(cookTime, 10) : undefined,
          images,
          ingredients: ingredients.split("\n").filter((l) => l.trim()),
          instructions: instructions.split("\n").filter((l) => l.trim()),
          mealTypes,
          cuisines,
          dietary,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Failed to save recipe");
        return;
      }

      router.push("/recipes");
    } catch {
      setSaveError("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  }

  // Step 1: URL Input
  if (!extracted) {
    return (
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold leading-none text-center mb-8">
          Import a Recipe
        </h1>

        <form onSubmit={handleExtract} className="space-y-4">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a recipe URL..."
            required
          />

          {extractError && (
            <p className="font-sans text-sm text-red">{extractError}</p>
          )}

          <Button type="submit" loading={extracting} className="w-full">
            {extracting ? "Extracting recipe..." : "Extract Recipe"}
          </Button>

          {extracting && (
            <div className="flex items-center justify-center gap-2 text-gray-600 font-sans text-sm">
              <Spinner />
              <span>This may take a moment...</span>
            </div>
          )}
        </form>
      </div>
    );
  }

  // Step 2: Review & Edit
  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl font-bold leading-none text-center mb-8">
        Review Recipe
      </h1>

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {images.map((src, i) => (
            <div key={i} className="relative shrink-0">
              <img
                src={src}
                alt={`Recipe image ${i + 1}`}
                className="w-24 h-24 object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white text-xs flex items-center justify-center"
                aria-label="Remove image"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <Divider className="my-6" />

      <div className="space-y-6">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Ingredients (one per line)
          </label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={8}
            className="w-full border border-gray-300 px-4 py-3 font-serif text-base text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
          />
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Instructions (one step per line)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={8}
            className="w-full border border-gray-300 px-4 py-3 font-serif text-base text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
          />
        </div>

        <Input
          label="Cook Time (minutes)"
          type="number"
          value={cookTime}
          onChange={(e) => setCookTime(e.target.value)}
          placeholder="45"
          min="0"
        />

        <Divider className="my-6" />

        <TagSelector
          label="Meal Type"
          options={MEAL_TYPES}
          selected={mealTypes}
          onToggle={(v) => handleToggle(mealTypes, setMealTypes, v)}
        />

        <TagSelector
          label="Cuisine"
          options={CUISINES}
          selected={cuisines}
          onToggle={(v) => handleToggle(cuisines, setCuisines, v)}
        />

        <TagSelector
          label="Dietary"
          options={DIETARY}
          selected={dietary}
          onToggle={(v) => handleToggle(dietary, setDietary, v)}
        />

        {saveError && (
          <p className="font-sans text-sm text-red">{saveError}</p>
        )}

        <div className="flex gap-4 pt-4">
          <Button onClick={handleSave} loading={saving} className="flex-1">
            {saving ? "Saving..." : "Save to Recipe Book"}
          </Button>
          <Button variant="secondary" onClick={handleBack} className="flex-1">
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}

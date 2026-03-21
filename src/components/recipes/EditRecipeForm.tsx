"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TagSelector from "@/components/ui/TagSelector";
import Divider from "@/components/ui/Divider";

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

interface EditRecipeFormProps {
  recipeId: string;
  initialData: {
    title: string;
    ingredients: string[];
    instructions: string[];
    cookTime: number | null;
    servings: number | null;
    storageTips: string | null;
    makeAheadNotes: string | null;
    servingSuggestions: string | null;
    techniqueNotes: string | null;
    mealTypes: string[];
    cuisines: string[];
    dietary: string[];
  };
}

export default function EditRecipeForm({ recipeId, initialData }: EditRecipeFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData.title);
  const [ingredients, setIngredients] = useState(initialData.ingredients.join("\n"));
  const [instructions, setInstructions] = useState(initialData.instructions.join("\n"));
  const [cookTime, setCookTime] = useState(initialData.cookTime?.toString() ?? "");
  const [servings, setServings] = useState(initialData.servings?.toString() ?? "");
  const [storageTips, setStorageTips] = useState(initialData.storageTips ?? "");
  const [makeAheadNotes, setMakeAheadNotes] = useState(initialData.makeAheadNotes ?? "");
  const [servingSuggestions, setServingSuggestions] = useState(initialData.servingSuggestions ?? "");
  const [techniqueNotes, setTechniqueNotes] = useState(initialData.techniqueNotes ?? "");
  const [mealTypes, setMealTypes] = useState<string[]>(initialData.mealTypes);
  const [cuisines, setCuisines] = useState<string[]>(initialData.cuisines);
  const [dietary, setDietary] = useState<string[]>(initialData.dietary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleToggle(
    list: string[],
    setList: (v: string[]) => void,
    value: string
  ) {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          ingredients: ingredients.split("\n").filter((l) => l.trim()),
          instructions: instructions.split("\n").filter((l) => l.trim()),
          cookTime: cookTime ? parseInt(cookTime, 10) : null,
          servings: servings ? parseInt(servings, 10) : null,
          storageTips: storageTips || null,
          makeAheadNotes: makeAheadNotes || null,
          servingSuggestions: servingSuggestions || null,
          techniqueNotes: techniqueNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      router.push(`/recipes/${recipeId}`);
      router.refresh();
    } catch {
      setError("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl font-bold leading-none text-center mb-8">
        Edit Recipe
      </h1>

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

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cook Time (minutes)"
            type="number"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            placeholder="45"
            min="0"
          />
          <Input
            label="Servings"
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="4"
            min="1"
          />
        </div>

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

        <details className="group">
          <summary className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 cursor-pointer hover:text-black transition-colors">
            Additional Notes (storage, tips, serving)
          </summary>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Storage Tips
              </label>
              <textarea
                value={storageTips}
                onChange={(e) => setStorageTips(e.target.value)}
                rows={2}
                placeholder="How to store leftovers..."
                className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
              />
            </div>
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Make-Ahead Notes
              </label>
              <textarea
                value={makeAheadNotes}
                onChange={(e) => setMakeAheadNotes(e.target.value)}
                rows={2}
                placeholder="Prep-ahead instructions..."
                className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
              />
            </div>
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Serving Suggestions
              </label>
              <textarea
                value={servingSuggestions}
                onChange={(e) => setServingSuggestions(e.target.value)}
                rows={2}
                placeholder="What to serve with..."
                className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
              />
            </div>
            <div>
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Technique Notes
              </label>
              <textarea
                value={techniqueNotes}
                onChange={(e) => setTechniqueNotes(e.target.value)}
                rows={2}
                placeholder="Tips and tricks..."
                className="w-full border border-gray-300 px-4 py-3 font-serif text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors resize-y"
              />
            </div>
          </div>
        </details>

        {error && (
          <p className="font-sans text-sm text-red">{error}</p>
        )}

        <div className="flex gap-4 pt-4">
          <Button onClick={handleSave} loading={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push(`/recipes/${recipeId}`)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

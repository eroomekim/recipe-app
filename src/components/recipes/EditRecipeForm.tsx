"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TagSelector from "@/components/ui/TagSelector";
import Divider from "@/components/ui/Divider";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { X } from "lucide-react";

/** Convert array of strings to an HTML unordered list */
function toHtmlList(items: string[]): string {
  if (items.length === 0) return "";
  return "<ul>" + items.map((item) => `<li>${item}</li>`).join("") + "</ul>";
}

/** Convert array of strings to an HTML ordered list */
function toHtmlOl(items: string[]): string {
  if (items.length === 0) return "";
  return "<ol>" + items.map((item) => `<li>${item}</li>`).join("") + "</ol>";
}

/** Extract text items from HTML (strips tags, splits on <li> or newlines) */
function fromHtml(html: string): string[] {
  // Extract content from <li> tags if present
  const liMatches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches) {
    return liMatches
      .map((li) => li.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean);
  }
  // Fallback: split on <br>, <p>, or newlines, strip remaining tags
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

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
    images: string[];
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
  const [images, setImages] = useState<string[]>(initialData.images ?? []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [ingredients, setIngredients] = useState(toHtmlList(initialData.ingredients));
  const [instructions, setInstructions] = useState(toHtmlOl(initialData.instructions));
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
          images,
          ingredients: fromHtml(ingredients),
          instructions: fromHtml(instructions),
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

        {/* Images */}
        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
            Images
          </label>
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
              {images.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  <img
                    src={src}
                    alt={`Recipe image ${i + 1}`}
                    className="w-24 h-24 object-cover"
                  />
                  <button
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Paste image URL..."
              className="flex-1 border border-gray-300 px-3 py-2 font-sans text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors"
            />
            <button
              onClick={() => {
                if (newImageUrl.trim()) {
                  setImages([...images, newImageUrl.trim()]);
                  setNewImageUrl("");
                }
              }}
              className="font-sans text-xs font-semibold uppercase tracking-wider bg-gray-50 text-gray-600 px-4 py-2 hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <RichTextEditor
          label="Ingredients"
          value={ingredients}
          onChange={setIngredients}
          placeholder="Add ingredients..."
          minHeight={200}
        />

        <RichTextEditor
          label="Instructions"
          value={instructions}
          onChange={setInstructions}
          placeholder="Add instructions..."
          minHeight={250}
        />

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
            <RichTextEditor
              label="Storage Tips"
              value={storageTips}
              onChange={setStorageTips}
              placeholder="How to store leftovers..."
              minHeight={100}
            />
            <RichTextEditor
              label="Make-Ahead Notes"
              value={makeAheadNotes}
              onChange={setMakeAheadNotes}
              placeholder="Prep-ahead instructions..."
              minHeight={100}
            />
            <RichTextEditor
              label="Serving Suggestions"
              value={servingSuggestions}
              onChange={setServingSuggestions}
              placeholder="What to serve with..."
              minHeight={100}
            />
            <RichTextEditor
              label="Technique Notes"
              value={techniqueNotes}
              onChange={setTechniqueNotes}
              placeholder="Tips and tricks..."
              minHeight={100}
            />
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

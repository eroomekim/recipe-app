"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TagSelector from "@/components/ui/TagSelector";
import Spinner from "@/components/ui/Spinner";
import Divider from "@/components/ui/Divider";
import { X } from "lucide-react";
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
  const [servings, setServings] = useState("");
  const [substitutions, setSubstitutions] = useState<
    { ingredient: string; substitute: string; notes: string }[]
  >([]);
  const [storageTips, setStorageTips] = useState("");
  const [makeAheadNotes, setMakeAheadNotes] = useState("");
  const [servingSuggestions, setServingSuggestions] = useState("");
  const [techniqueNotes, setTechniqueNotes] = useState("");

  // Polling state
  const [polling, setPolling] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [extractionStage, setExtractionStage] = useState<string | null>(null);
  const [platformBadge, setPlatformBadge] = useState<string | null>(null);

  function populateRecipeFields(recipe: ExtractedRecipe) {
    setExtracted(recipe);
    setTitle(recipe.title);
    setIngredients(recipe.ingredients.join("\n"));
    setInstructions(recipe.instructions.join("\n"));
    setCookTime(recipe.suggestedCookTimeMinutes?.toString() ?? "");
    setImages(recipe.images);
    setMealTypes(recipe.suggestedMealTypes);
    setCuisines(recipe.suggestedCuisines);
    setDietary(recipe.suggestedDietary);
    setServings(recipe.servings?.toString() ?? "");
    setSubstitutions(
      recipe.substitutions?.map((s) => ({
        ingredient: s.ingredient,
        substitute: s.substitute,
        notes: s.notes ?? "",
      })) ?? []
    );
    setStorageTips(recipe.storageTips ?? "");
    setMakeAheadNotes(recipe.makeAheadNotes ?? "");
    setServingSuggestions(recipe.servingSuggestions ?? "");
    setTechniqueNotes(recipe.techniqueNotes ?? "");
  }

  useEffect(() => {
    if (!polling || !jobId) return;

    const startTime = Date.now();
    const POLL_INTERVAL = 2000;
    const POLL_TIMEOUT = 5 * 60 * 1000;

    const interval = setInterval(async () => {
      if (Date.now() - startTime > POLL_TIMEOUT) {
        clearInterval(interval);
        setPolling(false);
        setExtractError("Extraction timed out. Try a different URL or use manual entry.");
        return;
      }

      try {
        const res = await fetch(`/api/extract/${jobId}`);
        const data = await res.json();

        setExtractionStage(data.stage);

        if (data.status === "completed" && data.recipe) {
          clearInterval(interval);
          setPolling(false);
          setPlatformBadge(data._meta?.platform ?? null);
          populateRecipeFields(data.recipe);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setPolling(false);
          setExtractError(data.error || "Extraction failed");
        }
      } catch {
        // Network error — keep polling
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [polling, jobId]);

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

      // Check if async (social media) or immediate (blog)
      if (data.type === "async") {
        setJobId(data.jobId);
        setExtracting(false);
        setPolling(true);
        return;
      }

      // Immediate result (blog)
      const recipe = data.type === "immediate" ? data.recipe : data as ExtractedRecipe;
      setPlatformBadge(data._meta?.platform ?? null);
      populateRecipeFields(recipe);
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
          servings: servings ? parseInt(servings, 10) : undefined,
          substitutions: substitutions.filter((s) => s.ingredient && s.substitute),
          storageTips: storageTips || undefined,
          makeAheadNotes: makeAheadNotes || undefined,
          servingSuggestions: servingSuggestions || undefined,
          techniqueNotes: techniqueNotes || undefined,
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

          {polling && (
            <div className="space-y-4 text-center">
              <Spinner />
              <p className="font-serif text-lg text-gray-600">
                {extractionStage === "fetching" && "Fetching page..."}
                {extractionStage === "downloading" && "Downloading video..."}
                {extractionStage === "transcribing" && "Transcribing video... (this may take a moment)"}
                {extractionStage === "extracting" && "Extracting recipe from content..."}
                {(!extractionStage || extractionStage === "detecting") && "Starting extraction..."}
              </p>
              <button
                onClick={() => { setPolling(false); setJobId(null); }}
                className="font-sans text-xs text-gray-500 hover:text-black transition-colors"
              >
                Cancel
              </button>
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

      {platformBadge && platformBadge !== "blog" && (
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 text-center mb-4">
          Extracted from {platformBadge}
        </p>
      )}

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
                className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white flex items-center justify-center"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
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

        <Input
          label="Servings"
          type="number"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          placeholder="4"
          min="1"
        />

        {/* Substitutions */}
        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Substitutions
          </label>
          {substitutions.map((sub, i) => (
            <div key={i} className="flex gap-2 mb-2 items-start">
              <input
                value={sub.ingredient}
                onChange={(e) => {
                  const updated = [...substitutions];
                  updated[i] = { ...updated[i], ingredient: e.target.value };
                  setSubstitutions(updated);
                }}
                placeholder="Original ingredient"
                className="flex-1 border border-gray-300 px-3 py-2 font-serif text-sm text-black focus:outline-none focus:border-black transition-colors"
              />
              <span className="text-gray-500 py-2">→</span>
              <input
                value={sub.substitute}
                onChange={(e) => {
                  const updated = [...substitutions];
                  updated[i] = { ...updated[i], substitute: e.target.value };
                  setSubstitutions(updated);
                }}
                placeholder="Substitute"
                className="flex-1 border border-gray-300 px-3 py-2 font-serif text-sm text-black focus:outline-none focus:border-black transition-colors"
              />
              <button
                onClick={() => setSubstitutions(substitutions.filter((_, j) => j !== i))}
                className="text-gray-500 hover:text-black px-2 py-2"
                aria-label="Remove substitution"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setSubstitutions([...substitutions, { ingredient: "", substitute: "", notes: "" }])
            }
            className="font-sans text-xs text-gray-600 hover:text-black transition-colors"
          >
            + Add substitution
          </button>
        </div>

        {/* Collapsible supplementary notes */}
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

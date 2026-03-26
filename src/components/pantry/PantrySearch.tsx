"use client";

import { useState, useRef, useMemo } from "react";
import { X, Search, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import type { IngredientMatchResult } from "@/types";

interface PantrySearchProps {
  knownIngredients: string[];
}

export default function PantrySearch({ knownIngredients }: PantrySearchProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<IngredientMatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(60);
  const [expandedMissing, setExpandedMissing] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    const q = inputValue.toLowerCase();
    return knownIngredients
      .filter((name) => name.toLowerCase().includes(q) && !selectedIngredients.includes(name))
      .slice(0, 8);
  }, [inputValue, knownIngredients, selectedIngredients]);

  function addIngredient(name: string) {
    if (!selectedIngredients.includes(name)) {
      setSelectedIngredients([...selectedIngredients, name]);
    }
    setInputValue("");
    inputRef.current?.focus();
  }

  function removeIngredient(name: string) {
    setSelectedIngredients(selectedIngredients.filter((i) => i !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        addIngredient(suggestions[0]);
      } else {
        addIngredient(inputValue.trim());
      }
    }
    if (e.key === "Backspace" && !inputValue && selectedIngredients.length > 0) {
      removeIngredient(selectedIngredients[selectedIngredients.length - 1]);
    }
  }

  async function search() {
    if (selectedIngredients.length === 0) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ingredients: selectedIngredients.join(","),
        threshold: String(threshold),
      });
      const res = await fetch(`/api/recipes/match-ingredients?${params}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleMissing(id: string) {
    const next = new Set(expandedMissing);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedMissing(next);
  }

  return (
    <div>
      {/* Input area */}
      <div className="border border-gray-300 p-3 mb-4 focus-within:border-black transition-colors">
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedIngredients.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-black text-white font-sans text-xs font-semibold uppercase tracking-wide"
            >
              {name}
              <button onClick={() => removeIngredient(name)} aria-label={`Remove ${name}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedIngredients.length === 0 ? "Type an ingredient..." : "Add another..."}
          className="w-full font-sans text-sm text-black placeholder:text-gray-500 focus:outline-none"
        />
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            {suggestions.map((name) => (
              <button
                key={name}
                onClick={() => addIngredient(name)}
                className="block w-full text-left px-2 py-1.5 font-sans text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Threshold slider + search button */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <label className="font-sans text-xs text-gray-500 uppercase tracking-wider block mb-1">
            Min. coverage: {threshold}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-black"
          />
        </div>
        <button
          onClick={search}
          disabled={selectedIngredients.length === 0 || loading}
          className="bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {loading ? "Searching..." : "Find Recipes"}
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div>
          <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
            {results.length} {results.length === 1 ? "Recipe" : "Recipes"} Found
          </h2>

          {results.length === 0 ? (
            <p className="font-serif text-lg text-gray-500 italic py-8 text-center">
              No recipes match your ingredients at {threshold}% coverage.
              Try lowering the threshold or adding more ingredients.
            </p>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.recipe.id} className="flex gap-4 group">
                  {/* Thumbnail */}
                  <Link href={`/recipes/${result.recipe.id}`} className="shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 overflow-hidden bg-gray-50">
                      {result.recipe.images[0] && (
                        <img
                          src={result.recipe.images[0]}
                          alt={result.recipe.title}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
                        />
                      )}
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/recipes/${result.recipe.id}`}>
                      <h3 className="font-display text-xl leading-none font-bold text-black group-hover:opacity-80 transition-opacity">
                        {result.recipe.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="font-sans text-xs font-bold text-black">
                        {result.matchedCount}/{result.totalCount} ingredients
                      </span>
                      <span className="font-sans text-xs text-gray-500">
                        {result.coveragePercent}% match
                      </span>
                      {result.recipe.cookTime && (
                        <span className="font-sans text-xs text-gray-500">
                          {result.recipe.cookTime} min
                        </span>
                      )}
                    </div>

                    {/* Missing ingredients */}
                    {result.missingIngredients.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleMissing(result.recipe.id)}
                          className="font-sans text-xs text-gray-400 hover:text-black transition-colors flex items-center gap-1"
                        >
                          {expandedMissing.has(result.recipe.id) ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          {result.missingIngredients.length} missing
                        </button>
                        {expandedMissing.has(result.recipe.id) && (
                          <ul className="mt-1 space-y-0.5">
                            {result.missingIngredients.map((name) => (
                              <li key={name} className="font-serif text-sm text-gray-500">
                                {name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

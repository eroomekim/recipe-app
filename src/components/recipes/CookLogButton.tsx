"use client";

import { useState, useEffect, useRef } from "react";
import { ChefHat, ChevronDown, ChevronUp } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface CookLogEntry {
  id: string;
  note: string | null;
  cookedAt: string;
}

interface CookLogData {
  totalCooks: number;
  lastCookedAt: string | null;
  entries: CookLogEntry[];
}

interface CookLogButtonProps {
  recipeId: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CookLogButton({ recipeId }: CookLogButtonProps) {
  const [data, setData] = useState<CookLogData | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(apiUrl(`/api/recipes/${recipeId}/cook-log`))
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [recipeId]);

  useEffect(() => {
    if (formOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [formOpen]);

  async function handleLog() {
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/recipes/${recipeId}/cook-log`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (res.ok) {
        const entry = await res.json();
        setData((prev) => prev ? {
          totalCooks: prev.totalCooks + 1,
          lastCookedAt: entry.cookedAt,
          entries: [entry, ...prev.entries],
        } : {
          totalCooks: 1,
          lastCookedAt: entry.cookedAt,
          entries: [entry],
        });
        setNote("");
        setFormOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLog();
    }
    if (e.key === "Escape") {
      setFormOpen(false);
      setNote("");
    }
  }

  return (
    <>
      {/* Button — renders inline with other action buttons */}
      <button
        onClick={() => setFormOpen(!formOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-black text-black font-sans text-xs font-semibold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
      >
        <ChefHat className="w-4 h-4" />
        I Made This
      </button>

      {/* Form + log — forces new row via basis-full */}
      {(formOpen || (data && data.totalCooks > 0)) && (
        <div className="basis-full">
          {formOpen && (
            <div className="flex gap-2 mt-1">
              <input
                ref={inputRef}
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How did it go? (optional)"
                className="flex-1 border border-gray-300 px-3 py-2 font-serif text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors"
              />
              <button
                onClick={handleLog}
                disabled={saving}
                className="bg-black text-white font-sans text-xs font-semibold uppercase tracking-wider px-4 py-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                {saving ? "..." : "Log"}
              </button>
            </div>
          )}

          {data && data.totalCooks > 0 && (
            <div className={formOpen ? "mt-3" : "mt-1"}>
              <button
                onClick={() => setLogExpanded(!logExpanded)}
                className="font-sans text-xs text-gray-500 hover:text-black transition-colors flex items-center gap-1"
              >
                Made {data.totalCooks} {data.totalCooks === 1 ? "time" : "times"}
                {data.lastCookedAt && <> · Last made {formatDate(data.lastCookedAt)}</>}
                {logExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {logExpanded && (
                <div className="mt-2 space-y-1.5">
                  {data.entries.map((entry) => (
                    <div key={entry.id} className="font-sans text-xs text-gray-500">
                      <span className="font-semibold text-gray-600">{formatDate(entry.cookedAt)}</span>
                      {entry.note && <span className="ml-2 font-serif italic">{entry.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

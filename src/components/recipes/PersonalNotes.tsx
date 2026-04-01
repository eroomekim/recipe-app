"use client";

import { useState, useRef, useEffect } from "react";
import { apiUrl } from "@/lib/api";

interface PersonalNotesProps {
  recipeId: string;
  initialNotes: string | null;
  initialAdaptations: string | null;
}

export default function PersonalNotes({
  recipeId,
  initialNotes,
  initialAdaptations,
}: PersonalNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [adaptations, setAdaptations] = useState(initialAdaptations ?? "");
  const [editing, setEditing] = useState<"notes" | "adaptations" | null>(null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      await fetch(apiUrl(`/api/recipes/${recipeId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalNotes: notes, personalAdaptations: adaptations }),
      });
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  const showEmpty = !notes && !adaptations && !editing;

  return (
    <div className="my-6">
      {editing === "notes" ? (
        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Our Story
          </label>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What does this recipe mean to you?"
            className="w-full border border-gray-300 px-3 py-2 font-serif text-lg italic text-gray-600 placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-y"
          />
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 mt-4">
            My Adaptations
          </label>
          <textarea
            value={adaptations}
            onChange={(e) => setAdaptations(e.target.value)}
            rows={2}
            placeholder="Changes you've made to the original..."
            className="w-full border border-gray-300 px-3 py-2 font-serif text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:border-black transition-colors resize-y"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={save}
              disabled={saving}
              className="font-sans text-xs font-semibold text-black hover:text-gray-600 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setNotes(initialNotes ?? "");
                setAdaptations(initialAdaptations ?? "");
                setEditing(null);
              }}
              className="font-sans text-xs text-gray-500 hover:text-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {(notes || adaptations) && (
            <div
              className="cursor-pointer group"
              onClick={() => setEditing("notes")}
            >
              {notes && (
                <p className="font-serif text-lg italic leading-relaxed text-gray-600">
                  {notes}
                </p>
              )}
              {adaptations && (
                <p className="font-serif text-sm text-gray-500 mt-2">
                  <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Adaptations:
                  </span>{" "}
                  {adaptations}
                </p>
              )}
              <span className="font-sans text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 block">
                Click to edit
              </span>
            </div>
          )}

          {showEmpty && (
            <button
              onClick={() => setEditing("notes")}
              className="block w-full text-left"
            >
              <p className="font-serif text-lg italic text-gray-400">
                Add your story...
              </p>
            </button>
          )}
        </>
      )}
    </div>
  );
}

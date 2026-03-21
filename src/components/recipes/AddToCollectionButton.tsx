"use client";

import { useState, useEffect } from "react";
import { FolderPlus } from "lucide-react";
import type { CollectionData } from "@/types";

interface Props {
  recipeId: string;
}

export default function AddToCollectionButton({ recipeId }: Props) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionData[]>([]);

  useEffect(() => {
    if (open) {
      fetch("/api/collections").then((r) => r.json()).then(setCollections).catch(() => {});
    }
  }, [open]);

  async function addToCollection(collectionId: string) {
    await fetch(`/api/collections/${collectionId}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId }),
    });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="flex flex-col items-center gap-1.5 w-full hover:bg-gray-100 transition-colors rounded-xl py-0.5"
      >
        <FolderPlus className="w-5 h-5 text-gray-600" />
        <span className="font-sans text-xs font-semibold text-gray-600">Save</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-lg py-1 min-w-[160px] z-30 rounded-lg">
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => addToCollection(c.id)}
              className="block w-full text-left px-3 py-2 font-sans text-xs text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
            >
              {c.name}
            </button>
          ))}
          {collections.length === 0 && (
            <p className="px-3 py-2 font-sans text-xs text-gray-400">No collections yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// src/components/recipes/CollectionBar.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import CreateCollectionModal from "./CreateCollectionModal";
import type { CollectionData, SmartCollectionData } from "@/types";
import { apiUrl } from "@/lib/api";

interface CollectionBarProps {
  onFilter: (recipeIds: string[] | null, label: string | null) => void;
  activeFilter: string | null;
}

export default function CollectionBar({ onFilter, activeFilter }: CollectionBarProps) {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [smartCollections, setSmartCollections] = useState<SmartCollectionData[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/collections")).then((r) => r.json()).then(setCollections).catch(() => {});
    fetch(apiUrl("/api/smart-collections")).then((r) => r.json()).then(setSmartCollections).catch(() => {});
  }, []);

  async function handleClick(id: string, recipeIds: string[] | null, name: string) {
    if (activeFilter === id) {
      onFilter(null, null);
      return;
    }

    // For user collections, fetch recipe IDs from API
    if (!recipeIds) {
      try {
        const res = await fetch(apiUrl(`/api/collections/${id}`));
        if (res.ok) {
          const data = await res.json();
          onFilter(data.recipeIds ?? [], id);
        }
      } catch { /* ignore */ }
      return;
    }

    onFilter(recipeIds, id);
  }

  const allCollections = [
    ...smartCollections.map((sc) => ({
      id: sc.id,
      name: sc.name,
      previewImages: sc.previewImages,
      recipeIds: sc.recipeIds as string[] | null,
      type: sc.type,
    })),
    ...collections.map((c) => ({
      id: c.id,
      name: c.name,
      previewImages: c.previewImages,
      recipeIds: null as string[] | null, // fetched on click
      type: "user" as const,
    })),
  ];

  if (allCollections.length === 0 && !showCreate) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {allCollections.map((col) => {
          const isActive = activeFilter === col.id;
          const heroImage = col.previewImages[0];

          return (
            <button
              key={col.id}
              onClick={() => handleClick(col.id, col.recipeIds, col.name)}
              className={`shrink-0 relative w-28 h-20 rounded-lg overflow-hidden transition-all ${
                isActive
                  ? "ring-2 ring-black"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              {/* Background image or placeholder */}
              {heroImage ? (
                <img
                  src={heroImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gray-200" />
              )}

              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black/40" />

              {/* Label */}
              <span className="absolute inset-0 flex items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-white">
                {col.name}
              </span>
            </button>
          );
        })}

        {/* New collection button */}
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 w-28 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 opacity-60 hover:opacity-100 hover:border-gray-500 transition-all"
        >
          <Plus className="w-5 h-5 text-gray-400" />
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-400">
            New
          </span>
        </button>
      </div>

      {activeFilter && (
        <button
          onClick={() => onFilter(null, null)}
          className="font-sans text-xs text-gray-500 hover:text-black mt-2 transition-colors"
        >
          Clear filter &times;
        </button>
      )}

      {showCreate && (
        <CreateCollectionModal
          onClose={() => setShowCreate(false)}
          onCreated={(newCol) => {
            setCollections([newCol, ...collections]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

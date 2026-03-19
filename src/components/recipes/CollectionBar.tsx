// src/components/recipes/CollectionBar.tsx
"use client";

import { useState, useEffect } from "react";
import CreateCollectionModal from "./CreateCollectionModal";
import type { CollectionData, SmartCollectionData } from "@/types";

interface CollectionBarProps {
  onFilter: (recipeIds: string[] | null, label: string | null) => void;
  activeFilter: string | null;
}

export default function CollectionBar({ onFilter, activeFilter }: CollectionBarProps) {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [smartCollections, setSmartCollections] = useState<SmartCollectionData[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/collections").then((r) => r.json()).then(setCollections).catch(() => {});
    fetch("/api/smart-collections").then((r) => r.json()).then(setSmartCollections).catch(() => {});
  }, []);

  async function handleClick(id: string, recipeIds: string[] | null, name: string) {
    if (activeFilter === id) {
      onFilter(null, null);
      return;
    }

    // For user collections, fetch recipe IDs from API
    if (!recipeIds) {
      try {
        const res = await fetch(`/api/collections/${id}`);
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
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {allCollections.map((col) => (
          <button
            key={col.id}
            onClick={() => handleClick(col.id, col.recipeIds, col.name)}
            className={`shrink-0 flex flex-col items-center gap-1.5 p-2 transition-colors ${
              activeFilter === col.id ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
          >
            {/* Preview images */}
            <div className="flex gap-0.5">
              {col.previewImages.slice(0, 3).map((img, i) => (
                <div key={i} className="w-10 h-10 overflow-hidden bg-gray-50">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {col.previewImages.length === 0 && (
                <div className="w-10 h-10 bg-gray-100" />
              )}
            </div>
            <span className={`font-sans text-xs font-semibold uppercase tracking-wider ${
              activeFilter === col.id ? "text-black" : "text-gray-500"
            }`}>
              {col.name}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 flex flex-col items-center gap-1.5 p-2 opacity-50 hover:opacity-100 transition-opacity"
        >
          <div className="w-10 h-10 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg">
            +
          </div>
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

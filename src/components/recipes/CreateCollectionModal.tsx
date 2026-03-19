// src/components/recipes/CreateCollectionModal.tsx
"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { CollectionData } from "@/types";

interface Props {
  onClose: () => void;
  onCreated: (collection: CollectionData) => void;
}

export default function CreateCollectionModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated({ id: data.id, name: data.name, description: null, recipeCount: 0, previewImages: [] });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white p-6 w-[90vw] max-w-[400px] rounded-[8px] animate-slideUp">
        <h2 className="font-display text-xl font-bold mb-4">New Collection</h2>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Thanksgiving, Date Night"
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <Button onClick={handleCreate} loading={saving} className="flex-1">
            Create
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

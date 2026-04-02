"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Square, CheckSquare, ShoppingCart } from "lucide-react";
import { apiUrl } from "@/lib/api";

interface GroceryItem {
  id: string;
  text: string;
  recipeId: string | null;
  recipeTitle: string | null;
  checked: boolean;
}

export default function GroceryList() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/grocery"))
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addItem() {
    if (!newItem.trim()) return;
    const res = await fetch(apiUrl("/api/grocery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newItem.trim() }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems([item, ...items]);
      setNewItem("");
    }
  }

  async function toggleItem(id: string, checked: boolean) {
    setItems(items.map((i) => (i.id === id ? { ...i, checked } : i)));
    await fetch(apiUrl("/api/grocery"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, checked }),
    });
  }

  async function deleteItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
    await fetch(apiUrl("/api/grocery"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function clearChecked() {
    setItems(items.filter((i) => !i.checked));
    await fetch(apiUrl("/api/grocery"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearChecked: true }),
    });
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  // Group unchecked items by recipe
  const grouped = new Map<string, GroceryItem[]>();
  const ungrouped: GroceryItem[] = [];
  for (const item of unchecked) {
    if (item.recipeTitle) {
      const key = item.recipeTitle;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    } else {
      ungrouped.push(item);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Add item input */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add an item..."
          className="flex-1 border border-gray-300 px-4 py-2.5 font-serif text-base text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors"
        />
        <button
          onClick={addItem}
          className="bg-black text-white px-4 py-2.5 hover:bg-gray-900 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16">
          <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="font-serif text-lg text-gray-500 italic">
            Your grocery list is empty
          </p>
          <p className="font-sans text-xs text-gray-400 mt-2">
            Add items above or add ingredients from a recipe
          </p>
        </div>
      )}

      {/* Unchecked items — grouped by recipe */}
      {ungrouped.length > 0 && (
        <div className="mb-6">
          <ul className="space-y-1">
            {ungrouped.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            ))}
          </ul>
        </div>
      )}

      {Array.from(grouped.entries()).map(([recipeTitle, groupItems]) => (
        <div key={recipeTitle} className="mb-6">
          <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            {recipeTitle}
          </h3>
          <ul className="space-y-1">
            {groupItems.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            ))}
          </ul>
        </div>
      ))}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400">
              Done ({checked.length})
            </h3>
            <button
              onClick={clearChecked}
              className="font-sans text-xs text-gray-400 hover:text-black transition-colors"
            >
              Clear done
            </button>
          </div>
          <ul className="space-y-1">
            {checked.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onDelete={deleteItem}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroceryRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItem;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2 group">
      <button
        onClick={() => onToggle(item.id, !item.checked)}
        className="shrink-0 text-gray-400 hover:text-black transition-colors"
      >
        {item.checked ? (
          <CheckSquare className="w-5 h-5 text-black" />
        ) : (
          <Square className="w-5 h-5 text-gray-300" />
        )}
      </button>
      <span
        className={`font-serif text-base flex-1 ${
          item.checked ? "line-through text-gray-400" : "text-black"
        }`}
      >
        {item.text}
      </span>
      <button
        onClick={() => onDelete(item.id)}
        className="shrink-0 text-gray-300 hover:text-red opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Remove"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

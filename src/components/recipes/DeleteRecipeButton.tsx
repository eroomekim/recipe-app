"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiUrl } from "@/lib/api";

export default function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this recipe?")) {
      return;
    }

    setDeleting(true);

    const res = await fetch(apiUrl(`/api/recipes/${recipeId}`), {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/recipes");
      router.refresh();
    } else {
      setDeleting(false);
      alert("Failed to delete recipe");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="font-sans text-xs text-gray-500 hover:text-red transition-colors disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete Recipe"}
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function DeleteRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this recipe?")) {
      return;
    }

    setDeleting(true);

    const res = await fetch(`/api/recipes/${recipeId}`, {
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
    <Button
      variant="secondary"
      onClick={handleDelete}
      loading={deleting}
      className="text-red border-red hover:bg-red/5"
    >
      Delete Recipe
    </Button>
  );
}

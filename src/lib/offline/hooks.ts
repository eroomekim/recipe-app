"use client";

import { useState, useEffect, useCallback } from "react";
import { syncAll, replayPendingChanges, isOnline } from "./sync";
import {
  getAllRecipes,
  getRecipe,
  putRecipe,
  deleteRecipeFromDB,
  addPendingChange,
} from "./db";
import { apiUrl } from "@/lib/api";
import type { RecipeDetail } from "@/types";

export function useOfflineRecipes() {
  const [recipes, setRecipes] = useState<RecipeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadFromDB = useCallback(async () => {
    const all = await getAllRecipes();
    setRecipes(all);
    setLoading(false);
  }, []);

  const sync = useCallback(async () => {
    if (!isOnline()) return;
    setSyncing(true);
    try {
      await replayPendingChanges();
      await syncAll();
      await loadFromDB();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }, [loadFromDB]);

  useEffect(() => {
    loadFromDB().then(() => {
      if (isOnline()) sync();
    });
  }, [loadFromDB, sync]);

  useEffect(() => {
    function handleOnline() {
      sync();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sync]);

  return { recipes, loading, syncing, sync };
}

export function useOfflineMutation() {
  const updateRecipe = useCallback(
    async (recipeId: string, payload: Record<string, unknown>) => {
      const existing = await getRecipe(recipeId);
      if (existing) {
        await putRecipe({ ...existing, ...payload });
      }

      if (isOnline()) {
        try {
          await fetch(apiUrl(`/api/recipes/${recipeId}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {
          await addPendingChange({
            type: "update",
            recipeId,
            payload,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        await addPendingChange({
          type: "update",
          recipeId,
          payload,
          createdAt: new Date().toISOString(),
        });
      }
    },
    []
  );

  const toggleFavorite = useCallback(
    async (recipeId: string, isFavorite: boolean) => {
      await updateRecipe(recipeId, { isFavorite });
    },
    [updateRecipe]
  );

  const deleteRecipe = useCallback(async (recipeId: string) => {
    await deleteRecipeFromDB(recipeId);

    if (isOnline()) {
      try {
        await fetch(apiUrl(`/api/recipes/${recipeId}`), { method: "DELETE" });
      } catch {
        await addPendingChange({
          type: "delete",
          recipeId,
          payload: {},
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      await addPendingChange({
        type: "delete",
        recipeId,
        payload: {},
        createdAt: new Date().toISOString(),
      });
    }
  }, []);

  return { updateRecipe, toggleFavorite, deleteRecipe };
}

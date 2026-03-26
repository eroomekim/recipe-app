import { apiUrl } from "@/lib/api";
import {
  putRecipes,
  deleteRecipeFromDB,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  getAllPendingChanges,
  deletePendingChange,
} from "./db";
import type { RecipeDetail } from "@/types";

interface SyncResponse {
  updated: RecipeDetail[];
  deletedIds: string[];
  syncTimestamp: string;
}

export async function syncAll(): Promise<{ synced: number; deleted: number }> {
  const lastSync = await getLastSyncTimestamp();
  const params = lastSync ? `?since=${encodeURIComponent(lastSync)}` : "";

  const res = await fetch(apiUrl(`/api/recipes/sync${params}`));
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

  const data: SyncResponse = await res.json();

  if (data.updated.length > 0) {
    await putRecipes(data.updated);
  }

  for (const id of data.deletedIds) {
    await deleteRecipeFromDB(id);
  }

  await setLastSyncTimestamp(data.syncTimestamp);

  return { synced: data.updated.length, deleted: data.deletedIds.length };
}

export async function replayPendingChanges(): Promise<number> {
  const changes = await getAllPendingChanges();
  let replayed = 0;

  for (const change of changes) {
    try {
      if (change.type === "update" || change.type === "favorite") {
        const res = await fetch(apiUrl(`/api/recipes/${change.recipeId}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change.payload),
        });
        if (!res.ok && res.status !== 404) continue;
      } else if (change.type === "delete") {
        const res = await fetch(apiUrl(`/api/recipes/${change.recipeId}`), {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 404) continue;
      }

      await deletePendingChange(change.id);
      replayed++;
    } catch {
      break;
    }
  }

  return replayed;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

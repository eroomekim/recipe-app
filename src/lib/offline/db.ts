import { openDB, type IDBPDatabase } from "idb";
import type { RecipeDetail } from "@/types";

export interface PendingChange {
  id: string;
  type: "update" | "delete" | "favorite";
  recipeId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const DB_NAME = "recipe-book";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("recipes")) {
          db.createObjectStore("recipes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("pendingChanges")) {
          db.createObjectStore("pendingChanges", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllRecipes(): Promise<RecipeDetail[]> {
  const db = await getDB();
  return db.getAll("recipes");
}

export async function getRecipe(id: string): Promise<RecipeDetail | undefined> {
  const db = await getDB();
  return db.get("recipes", id);
}

export async function putRecipe(recipe: RecipeDetail): Promise<void> {
  const db = await getDB();
  await db.put("recipes", recipe);
}

export async function putRecipes(recipes: RecipeDetail[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("recipes", "readwrite");
  for (const recipe of recipes) {
    await tx.store.put(recipe);
  }
  await tx.done;
}

export async function deleteRecipeFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("recipes", id);
}

export async function addPendingChange(change: Omit<PendingChange, "id">): Promise<void> {
  const db = await getDB();
  await db.add("pendingChanges", change);
}

export async function getAllPendingChanges(): Promise<PendingChange[]> {
  const db = await getDB();
  return db.getAll("pendingChanges");
}

export async function clearPendingChanges(): Promise<void> {
  const db = await getDB();
  await db.clear("pendingChanges");
}

export async function deletePendingChange(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingChanges", id);
}

export async function getLastSyncTimestamp(): Promise<string | null> {
  const db = await getDB();
  return db.get("meta", "lastSync") ?? null;
}

export async function setLastSyncTimestamp(timestamp: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", timestamp, "lastSync");
}

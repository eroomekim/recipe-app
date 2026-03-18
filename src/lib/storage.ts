import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const BUCKET = "recipe-images";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOWNLOAD_TIMEOUT = 10_000; // 10s

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mime] ?? "jpg";
}

export async function downloadAndUploadImage(
  url: string,
  userId: string,
  recipeId: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new Error(`Invalid image type: ${contentType}`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      throw new Error(`Image too large: ${buffer.byteLength} bytes`);
    }

    const ext = extensionFromMime(contentType);
    const filename = `${randomUUID()}.${ext}`;
    const path = `${userId}/${recipeId}/${filename}`;

    const supabase = getServiceClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadRecipeImages(
  imageUrls: string[],
  userId: string,
  recipeId: string
): Promise<string[]> {
  const results: string[] = [];

  for (const url of imageUrls) {
    try {
      const publicUrl = await downloadAndUploadImage(url, userId, recipeId);
      results.push(publicUrl);
    } catch (err) {
      console.warn(`Failed to download/upload image ${url}:`, err);
    }
  }

  return results;
}

export async function deleteRecipeImages(
  userId: string,
  recipeId: string
): Promise<void> {
  const supabase = getServiceClient();
  const prefix = `${userId}/${recipeId}/`;

  const { data: files } = await supabase.storage.from(BUCKET).list(prefix);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${prefix}${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

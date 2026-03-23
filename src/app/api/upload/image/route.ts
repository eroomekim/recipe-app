import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import sharp from "sharp";
// @ts-expect-error — heic-convert has no type declarations
import heicConvert from "heic-convert";

const BUCKET = "recipe-images";
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 20MB" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Supported formats: JPEG, PNG, WebP, HEIC" },
      { status: 400 }
    );
  }

  try {
    let buffer = Buffer.from(await file.arrayBuffer());
    let contentType = file.type;

    // Convert HEIC/HEIF to JPEG
    if (HEIC_TYPES.has(file.type)) {
      const converted = await heicConvert({
        buffer,
        format: "JPEG",
        quality: 0.9,
      });
      buffer = Buffer.from(converted);
      contentType = "image/jpeg";
    }

    // Auto-rotate if EXIF orientation is set
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.orientation && metadata.orientation > 1) {
        buffer = Buffer.from(await sharp(buffer).rotate().toBuffer());
      }
    } catch {
      // proceed without rotation
    }

    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const path = `${user.id}/uploads/${filename}`;

    const service = getServiceClient();
    const { error } = await service.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType });

    if (error) throw error;

    const { data } = service.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("Image upload failed:", err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

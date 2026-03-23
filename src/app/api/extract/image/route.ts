import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
// @ts-expect-error — heic-convert has no type declarations
import heicConvert from "heic-convert";
import {
  validateImageFiles,
  extractRecipeFromImages,
  type PreparedFile,
} from "@/lib/extraction/image-extractor";

// Allow longer execution for Claude vision API calls
export const maxDuration = 60;

const IMAGE_DAILY_LIMIT = parseInt(
  process.env.RATE_LIMIT_IMAGE_DAILY ?? "10",
  10
);

async function getImageExtractionCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return prisma.extractionLog.count({
    where: {
      userId,
      type: "image",
      createdAt: { gte: startOfDay },
    },
  });
}

async function logImageExtraction(
  userId: string,
  status: "success" | "failed"
) {
  await prisma.extractionLog.create({
    data: { userId, url: "image-upload", type: "image", status },
  });
}

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  const result = await heicConvert({
    buffer,
    format: "JPEG",
    quality: 0.9,
  });
  // heic-convert returns Uint8Array, convert to Buffer
  return Buffer.from(result);
}

// Auto-rotate image using EXIF orientation data (phone photos are often rotated)
async function autoRotate(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer).rotate().toBuffer();
  } catch {
    return buffer;
  }
}

async function prepareFile(
  buffer: Buffer,
  mimeType: string
): Promise<PreparedFile> {
  // Convert HEIC/HEIF to JPEG using heic-convert (sharp lacks HEVC codec)
  if (HEIC_TYPES.has(mimeType)) {
    const converted = await convertHeicToJpeg(buffer);
    const rotated = await autoRotate(converted);
    return { base64: rotated.toString("base64"), mediaType: "image/jpeg" };
  }

  // Detect actual format via sharp metadata for images that may be misreported
  // (iOS sometimes reports HEIC as image/jpeg)
  if (mimeType.startsWith("image/")) {
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.format === "heif") {
        const converted = await convertHeicToJpeg(buffer);
        const rotated = await autoRotate(converted);
        return {
          base64: rotated.toString("base64"),
          mediaType: "image/jpeg",
        };
      }
    } catch {
      // If sharp can't read metadata, proceed with original
    }
    // Auto-rotate non-HEIC images too (JPEG/PNG from phones have EXIF rotation)
    const rotated = await autoRotate(buffer);
    return { base64: rotated.toString("base64"), mediaType: mimeType };
  }

  return { base64: buffer.toString("base64"), mediaType: mimeType };
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

  // Rate limit
  const count = await getImageExtractionCount(user.id);
  if (count >= IMAGE_DAILY_LIMIT) {
    return NextResponse.json(
      { error: "Image extraction limit reached (10/day). Try again tomorrow." },
      { status: 429 }
    );
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const files = formData.getAll("files") as File[];

  // Validate
  try {
    validateImageFiles(files);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid files" },
      { status: 400 }
    );
  }

  // Process files
  try {
    const prepared: PreparedFile[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const preparedFile = await prepareFile(buffer, file.type);
      prepared.push(preparedFile);
    }

    const recipe = await extractRecipeFromImages(prepared);

    await logImageExtraction(user.id, "success");

    return NextResponse.json({ recipe });
  } catch (err) {
    console.error("Image extraction failed:", err);
    await logImageExtraction(user.id, "failed");

    const message = err instanceof Error ? err.message : "Extraction failed";

    if (message.includes("No recipe found")) {
      return NextResponse.json(
        {
          error:
            "No recipe found in the uploaded images. Try a clearer photo or different angle.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "Failed to extract recipe from image" },
      { status: 500 }
    );
  }
}

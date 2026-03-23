import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
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

async function prepareFile(
  buffer: Buffer,
  mimeType: string
): Promise<PreparedFile> {
  // Convert HEIC/HEIF to JPEG
  if (HEIC_TYPES.has(mimeType)) {
    const converted = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    return { base64: converted.toString("base64"), mediaType: "image/jpeg" };
  }

  // Detect actual format via sharp for images that may be misreported (iOS sometimes reports HEIC as image/jpeg)
  if (mimeType.startsWith("image/")) {
    try {
      const metadata = await sharp(buffer).metadata();
      if (metadata.format === "heif") {
        const converted = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
        return {
          base64: converted.toString("base64"),
          mediaType: "image/jpeg",
        };
      }
    } catch {
      // If sharp can't read metadata, proceed with original
    }
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

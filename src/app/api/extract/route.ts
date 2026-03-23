import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { scrapePage, extractRecipeFromPage } from "@/lib/scraper";
import { detectPlatform, isSocialMedia } from "@/lib/extraction/platform-detector";
import { jobManager } from "@/lib/extraction/job-manager";
import { runExtractionPipeline } from "@/lib/extraction/pipeline";

const DAILY_LIMIT = parseInt(process.env.RATE_LIMIT_DAILY ?? "20", 10);

async function getTodayCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.extractionLog.count({
    where: {
      userId,
      type: { in: ["blog", "social"] },
      createdAt: { gte: startOfDay },
    },
  });
}

async function logExtraction(userId: string, url: string, type: "blog" | "social", status: "success" | "failed") {
  await prisma.extractionLog.create({
    data: { userId, url, type, status },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayCount = await getTodayCount(user.id);
  if (todayCount >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: "Daily extraction limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  const platform = detectPlatform(url);

  // Social media: async pipeline
  if (isSocialMedia(platform)) {
    const job = jobManager.create(user.id, url);

    await logExtraction(user.id, url, "social", "success");

    // Fire-and-forget — pipeline runs in background
    runExtractionPipeline(job.id, url, platform).catch(async (err) => {
      console.error("Pipeline error:", err);
      jobManager.fail(job.id, "Extraction failed unexpectedly");
      // Log failure (the success log above still counts toward daily limit)
    });

    return NextResponse.json({
      type: "async",
      jobId: job.id,
      status: "processing",
    });
  }

  // Blog: synchronous Cheerio extraction (existing path)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const page = await scrapePage(url);
      const recipe = extractRecipeFromPage(page);

      if (!recipe.title || recipe.title === "Untitled Recipe") {
        if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
          await logExtraction(user.id, url, "blog", "failed");
          return NextResponse.json(
            { error: "Could not extract a recipe from this page. Try a different URL or use manual entry." },
            { status: 422 }
          );
        }
      }

      await logExtraction(user.id, url, "blog", "success");

      return NextResponse.json({
        type: "immediate",
        recipe,
        sourceUrl: url,
        _meta: {
          method: page.jsonLd ? "json-ld" : "html-fallback",
          platform: "blog",
        },
      });
    } catch (err) {
      if (attempt === 1) {
        console.error("Extraction failed after retry:", err);
        await logExtraction(user.id, url, "blog", "failed");
        const message = err instanceof Error ? err.message : "Extraction failed";
        return NextResponse.json(
          { error: `Failed to extract recipe: ${message}` },
          { status: 500 }
        );
      }
    }
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapePage, extractRecipeFromPage } from "@/lib/scraper";

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; date: string }>();
const DAILY_LIMIT = parseInt(process.env.RATE_LIMIT_DAILY ?? "20", 10);

function checkRateLimit(userId: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const entry = rateLimitMap.get(userId);

  if (!entry || entry.date !== today) {
    rateLimitMap.set(userId, { count: 1, date: today });
    return true;
  }

  if (entry.count >= DAILY_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.id)) {
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

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // Attempt extraction with one retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const page = await scrapePage(url);
      const recipe = extractRecipeFromPage(page);

      // Validate we got something useful
      if (!recipe.title || recipe.title === "Untitled Recipe") {
        if (recipe.ingredients.length === 0 && recipe.instructions.length === 0) {
          return NextResponse.json(
            {
              error:
                "Could not extract a recipe from this page. The page may not contain structured recipe data. Try a different URL or use manual entry.",
            },
            { status: 422 }
          );
        }
      }

      return NextResponse.json({
        ...recipe,
        sourceUrl: url,
        _meta: {
          method: page.jsonLd ? "json-ld" : "html-fallback",
        },
      });
    } catch (err) {
      if (attempt === 1) {
        console.error("Extraction failed after retry:", err);
        const message =
          err instanceof Error ? err.message : "Extraction failed";
        return NextResponse.json(
          { error: `Failed to extract recipe: ${message}` },
          { status: 500 }
        );
      }
    }
  }
}

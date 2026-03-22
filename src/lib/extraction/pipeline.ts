// src/lib/extraction/pipeline.ts
import type { ExtractedRecipe } from "@/types";
import type { PlatformAdapter } from "./types";
import { jobManager } from "./job-manager";
import { downloadVideo } from "./video-downloader";
import { getTranscriber } from "./transcriber";
import { getStructurer } from "./recipe-structurer";
import { scrapePage, extractRecipeFromPage } from "../scraper";
import { detectPlatform, isSocialMedia } from "./platform-detector";
import { youtubeAdapter } from "./adapters/youtube";
import { instagramAdapter } from "./adapters/instagram";
import { twitterAdapter } from "./adapters/twitter";
import { pinterestAdapter } from "./adapters/pinterest";
import { facebookAdapter } from "./adapters/facebook";

const adapters: PlatformAdapter[] = [
  youtubeAdapter,
  instagramAdapter,
  twitterAdapter,
  pinterestAdapter,
  facebookAdapter,
];

function getAdapter(platform: string): PlatformAdapter | null {
  return adapters.find((a) => a.name === platform) ?? null;
}

/**
 * Extract blog URLs from social media text content.
 * Returns the first URL that points to a non-social-media site (likely a recipe blog).
 */
function extractBlogUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s"',)]+/g;
  const urls = text.match(urlPattern);
  if (!urls) return null;

  for (let url of urls) {
    // Clean trailing ellipsis and unicode junk (Twitter truncates URLs)
    url = url.replace(/[…\u2026]+$/, "").replace(/\.{2,}$/, "");

    try {
      // Validate it's a real URL
      new URL(url);
      const platform = detectPlatform(url);
      if (!isSocialMedia(platform)) {
        return url;
      }
    } catch {
      // Invalid URL, skip
    }
  }
  return null;
}

/**
 * Try to extract a recipe from a blog URL using the existing Cheerio scraper.
 * Returns null if extraction fails or yields no useful content.
 */
async function tryBlogExtraction(blogUrl: string): Promise<ExtractedRecipe | null> {
  try {
    const page = await scrapePage(blogUrl);
    const recipe = extractRecipeFromPage(page);

    // Check if we got something useful
    if (recipe.ingredients.length > 0 || recipe.instructions.length > 0) {
      return recipe;
    }
  } catch {
    // Blog extraction failed
  }
  return null;
}

/**
 * Run the full extraction pipeline for a social media URL.
 * Updates job status as it progresses through stages.
 * This function runs in the background (fire-and-forget from the API route).
 */
export async function runExtractionPipeline(
  jobId: string,
  url: string,
  platform: string
): Promise<void> {
  try {
    // Stage: detecting
    jobManager.updateStage(jobId, "processing", "detecting");
    const adapter = getAdapter(platform);
    if (!adapter) {
      jobManager.fail(jobId, `Unsupported platform: ${platform}`);
      return;
    }

    // Stage: fetching
    jobManager.updateStage(jobId, "processing", "fetching");
    const content = await adapter.extract(url);

    // Check if adapter returned empty content
    if (!content.text && content.images.length === 0 && !content.videoUrl) {
      jobManager.fail(jobId, "No content found at this URL. The platform may have blocked access or the content may be unavailable.");
      return;
    }

    // Check for blog URL in content — if found, use Cheerio scraper for better extraction
    const blogUrl = content.linkedBlogUrl || extractBlogUrl(content.text);
    if (blogUrl) {
      jobManager.updateStage(jobId, "processing", "extracting");
      const blogRecipe = await tryBlogExtraction(blogUrl);
      if (blogRecipe) {
        // Merge: use blog recipe data but keep social media images if blog has none
        if (blogRecipe.images.length === 0 && content.images.length > 0) {
          blogRecipe.images = content.images;
        }
        jobManager.complete(jobId, blogRecipe, platform, blogUrl);
        return;
      }
      // Blog extraction failed — fall through to AI structuring
    }

    // Stage: downloading video (if applicable)
    let transcript = "";
    let downloadCleanup: (() => Promise<void>) | null = null;

    if (content.videoUrl) {
      jobManager.updateStage(jobId, "processing", "downloading");
      try {
        const download = await downloadVideo(content.videoUrl, jobId);
        downloadCleanup = download.cleanup;

        // Stage: transcribing
        const transcriber = getTranscriber();
        if (transcriber) {
          jobManager.updateStage(jobId, "processing", "transcribing");
          transcript = await transcriber.transcribe(download.filePath);
        }
      } catch (err) {
        // Video download/transcription failed — continue with text only
        console.error("Video processing failed:", err);
      } finally {
        if (downloadCleanup) await downloadCleanup();
      }
    }

    // Combine text content
    const fullText = [content.text, transcript].filter(Boolean).join("\n\n");

    // Stage: extracting (AI structuring)
    jobManager.updateStage(jobId, "processing", "extracting");
    const structurer = getStructurer();

    if (!structurer) {
      jobManager.fail(jobId, "AI recipe extraction is not configured. Set ANTHROPIC_API_KEY.");
      return;
    }

    let recipe: ExtractedRecipe;
    try {
      recipe = await structurer.structure({
        text: fullText,
        images: content.images,
        platform,
        originalUrl: url,
      });
    } catch {
      // Fallback: try with text only (no transcript)
      if (transcript && content.text) {
        try {
          recipe = await structurer.structure({
            text: content.text,
            images: content.images,
            platform,
            originalUrl: url,
          });
        } catch {
          // Final fallback: partial result
          recipe = {
            title: "Untitled Recipe",
            ingredients: [],
            instructions: [],
            images: content.images,
            suggestedMealTypes: [],
            suggestedCuisines: [],
            suggestedDietary: [],
            suggestedCookTimeMinutes: null,
            servings: null,
            substitutions: [],
            storageTips: "",
            makeAheadNotes: "",
            servingSuggestions: "",
            techniqueNotes: "",
            nutrition: null,
          };
        }
      } else {
        recipe = {
          title: "Untitled Recipe",
          ingredients: [],
          instructions: [],
          images: content.images,
          suggestedMealTypes: [],
          suggestedCuisines: [],
          suggestedDietary: [],
          suggestedCookTimeMinutes: null,
          servings: null,
          substitutions: [],
          storageTips: "",
          makeAheadNotes: "",
          servingSuggestions: "",
          techniqueNotes: "",
          nutrition: null,
        };
      }
    }

    jobManager.complete(jobId, recipe, platform, content.linkedBlogUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    jobManager.fail(jobId, message);
  }
}

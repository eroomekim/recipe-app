// src/lib/extraction/pipeline.ts
import type { ExtractedRecipe } from "@/types";
import type { PlatformAdapter } from "./types";
import { jobManager } from "./job-manager";
import { downloadVideo } from "./video-downloader";
import { getTranscriber } from "./transcriber";
import { getStructurer } from "./recipe-structurer";
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
        };
      }
    }

    jobManager.complete(jobId, recipe, platform, content.linkedBlogUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    jobManager.fail(jobId, message);
  }
}

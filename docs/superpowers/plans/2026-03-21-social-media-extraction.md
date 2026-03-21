# Social Media Recipe Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the recipe import to extract recipes from YouTube, Instagram, Twitter/X, Pinterest, and Facebook using platform-specific adapters, video transcription, and AI recipe structuring.

**Architecture:** A platform detector routes URLs to adapters. Blog URLs use existing Cheerio (synchronous). Social media URLs create async jobs processed through: Playwright fetch → video download → Whisper transcription → AI structuring → ExtractedRecipe. The client polls for job progress.

**Tech Stack:** Next.js 16, TypeScript, Playwright, youtube-transcript, OpenAI Whisper API (direct fetch), Anthropic SDK, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-social-media-extraction-design.md`

---

## File Structure

### New files:

| File | Responsibility |
|------|---------------|
| `src/lib/extraction/platform-detector.ts` | Detect platform from URL hostname |
| `src/lib/extraction/platform-detector.test.ts` | Tests for platform detection |
| `src/lib/extraction/types.ts` | PlatformContent, ExtractionJob, adapter interfaces |
| `src/lib/extraction/job-manager.ts` | In-memory job store with timeout and cleanup |
| `src/lib/extraction/job-manager.test.ts` | Tests for job lifecycle |
| `src/lib/extraction/browser.ts` | Shared Playwright browser instance management |
| `src/lib/extraction/video-downloader.ts` | Download video to temp file |
| `src/lib/extraction/transcriber.ts` | Whisper API transcription (direct fetch) |
| `src/lib/extraction/recipe-structurer.ts` | AI recipe structuring via Anthropic |
| `src/lib/extraction/pipeline.ts` | Orchestrates adapter → download → transcribe → structure |
| `src/lib/extraction/adapters/youtube.ts` | YouTube adapter (transcript package) |
| `src/lib/extraction/adapters/instagram.ts` | Instagram adapter (Playwright) |
| `src/lib/extraction/adapters/twitter.ts` | Twitter/X adapter (Playwright) |
| `src/lib/extraction/adapters/pinterest.ts` | Pinterest adapter (Playwright) |
| `src/lib/extraction/adapters/facebook.ts` | Facebook adapter (Playwright) |
| `src/app/api/extract/[jobId]/route.ts` | Poll endpoint for async jobs |

### Modified files:

| File | Changes |
|------|---------|
| `package.json` | Add playwright, youtube-transcript, @anthropic-ai/sdk |
| `src/types/index.ts` | Add ExtractResponse, JobPollResponse types |
| `src/app/api/extract/route.ts` | Add platform detection, async job creation, discriminated response |
| `src/components/recipes/ImportForm.tsx` | Add polling mode with stage progress |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
pnpm add playwright @anthropic-ai/sdk youtube-transcript
```

- [ ] **Step 2: Install Playwright browsers**

```bash
pnpm exec playwright install chromium
```

Note: This downloads ~130MB of Chromium. Only chromium is needed (not firefox/webkit).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add playwright, youtube-transcript, and anthropic-ai/sdk dependencies"
```

---

## Task 2: Types & Interfaces

**Files:**
- Create: `src/lib/extraction/types.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Create extraction types module**

```typescript
// src/lib/extraction/types.ts
import type { ExtractedRecipe } from "@/types";

export interface PlatformContent {
  text: string;
  images: string[];
  videoUrl: string | null;
  metadata: {
    author?: string;
    platform: string;
    originalUrl: string;
  };
  linkedBlogUrl?: string; // Pinterest: link to original blog
}

export interface PlatformAdapter {
  name: string;
  extract(url: string): Promise<PlatformContent>;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type JobStage = "detecting" | "fetching" | "downloading" | "transcribing" | "extracting" | "complete";

export interface ExtractionJob {
  id: string;
  userId: string;
  url: string;
  status: JobStatus;
  stage: JobStage | null;
  result: ExtractedRecipe | null;
  error: string | null;
  platform: string | null;
  linkedBlogUrl: string | null;
  createdAt: number;
}

export interface StructuringInput {
  text: string;
  images: string[];
  platform: string;
  originalUrl: string;
}

export interface TranscriptionProvider {
  transcribe(filePath: string): Promise<string>;
}

export interface RecipeStructurerInterface {
  structure(content: StructuringInput): Promise<ExtractedRecipe>;
}
```

- [ ] **Step 2: Add API response types to src/types/index.ts**

Append to the end of `src/types/index.ts`:

```typescript
export type ExtractResponse =
  | {
      type: "immediate";
      recipe: ExtractedRecipe;
      sourceUrl: string;
      _meta: { method: string; platform: "blog" };
    }
  | {
      type: "async";
      jobId: string;
      status: "processing";
    };

export interface JobPollResponse {
  status: "pending" | "processing" | "completed" | "failed";
  stage: string | null;
  recipe: ExtractedRecipe | null;
  sourceUrl: string | null;
  _meta: { method: string; platform: string } | null;
  error: string | null;
  linkedBlogUrl: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/extraction/types.ts src/types/index.ts
git commit -m "feat: add extraction pipeline types and API response contracts"
```

---

## Task 3: Platform Detector

**Files:**
- Create: `src/lib/extraction/platform-detector.ts`
- Create: `src/lib/extraction/platform-detector.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/extraction/platform-detector.test.ts
import { describe, it, expect } from "vitest";
import { detectPlatform } from "./platform-detector";

describe("detectPlatform", () => {
  it("detects YouTube URLs", () => {
    expect(detectPlatform("https://www.youtube.com/watch?v=abc123")).toBe("youtube");
    expect(detectPlatform("https://youtu.be/abc123")).toBe("youtube");
  });

  it("detects Instagram URLs", () => {
    expect(detectPlatform("https://www.instagram.com/p/abc123/")).toBe("instagram");
    expect(detectPlatform("https://instagram.com/reel/abc123/")).toBe("instagram");
  });

  it("detects Twitter/X URLs", () => {
    expect(detectPlatform("https://twitter.com/user/status/123")).toBe("twitter");
    expect(detectPlatform("https://x.com/user/status/123")).toBe("twitter");
  });

  it("detects Pinterest URLs", () => {
    expect(detectPlatform("https://www.pinterest.com/pin/123/")).toBe("pinterest");
    expect(detectPlatform("https://pin.it/abc123")).toBe("pinterest");
  });

  it("detects Facebook URLs", () => {
    expect(detectPlatform("https://www.facebook.com/user/posts/123")).toBe("facebook");
    expect(detectPlatform("https://fb.com/story/123")).toBe("facebook");
  });

  it("returns blog for unknown URLs", () => {
    expect(detectPlatform("https://seriouseats.com/recipe")).toBe("blog");
    expect(detectPlatform("https://example.com/my-recipe")).toBe("blog");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/extraction/platform-detector.test.ts`

- [ ] **Step 3: Implement platform detector**

```typescript
// src/lib/extraction/platform-detector.ts
export type Platform = "youtube" | "instagram" | "twitter" | "pinterest" | "facebook" | "blog";

const PLATFORM_PATTERNS: { platform: Platform; hostnames: string[] }[] = [
  { platform: "youtube", hostnames: ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"] },
  { platform: "instagram", hostnames: ["instagram.com", "www.instagram.com"] },
  { platform: "twitter", hostnames: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"] },
  { platform: "pinterest", hostnames: ["pinterest.com", "www.pinterest.com", "pin.it"] },
  { platform: "facebook", hostnames: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com", "m.facebook.com"] },
];

export function detectPlatform(url: string): Platform {
  try {
    const { hostname } = new URL(url);
    for (const { platform, hostnames } of PLATFORM_PATTERNS) {
      if (hostnames.includes(hostname)) return platform;
    }
  } catch {
    // Invalid URL
  }
  return "blog";
}

export function isSocialMedia(platform: Platform): boolean {
  return platform !== "blog";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/extraction/platform-detector.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/extraction/platform-detector.ts src/lib/extraction/platform-detector.test.ts
git commit -m "feat: add platform detector for URL routing"
```

---

## Task 4: Job Manager

**Files:**
- Create: `src/lib/extraction/job-manager.ts`
- Create: `src/lib/extraction/job-manager.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/extraction/job-manager.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { jobManager } from "./job-manager";

beforeEach(() => {
  jobManager.clear();
});

describe("jobManager", () => {
  it("creates a job with pending status", () => {
    const job = jobManager.create("user1", "https://youtube.com/watch?v=abc");
    expect(job.status).toBe("pending");
    expect(job.userId).toBe("user1");
    expect(job.id).toBeTruthy();
  });

  it("retrieves a job by id", () => {
    const created = jobManager.create("user1", "https://example.com");
    const retrieved = jobManager.get(created.id);
    expect(retrieved).toEqual(created);
  });

  it("returns null for nonexistent job", () => {
    expect(jobManager.get("nonexistent")).toBeNull();
  });

  it("updates job status and stage", () => {
    const job = jobManager.create("user1", "https://example.com");
    jobManager.updateStage(job.id, "processing", "fetching");
    const updated = jobManager.get(job.id);
    expect(updated?.status).toBe("processing");
    expect(updated?.stage).toBe("fetching");
  });

  it("completes a job with result", () => {
    const job = jobManager.create("user1", "https://example.com");
    const mockRecipe = { title: "Test" } as any;
    jobManager.complete(job.id, mockRecipe, "youtube");
    const completed = jobManager.get(job.id);
    expect(completed?.status).toBe("completed");
    expect(completed?.result?.title).toBe("Test");
  });

  it("fails a job with error", () => {
    const job = jobManager.create("user1", "https://example.com");
    jobManager.fail(job.id, "Something went wrong");
    const failed = jobManager.get(job.id);
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("Something went wrong");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/extraction/job-manager.test.ts`

- [ ] **Step 3: Implement job manager**

```typescript
// src/lib/extraction/job-manager.ts
import { createId } from "@paralleldrive/cuid2";
import type { ExtractedRecipe } from "@/types";
import type { ExtractionJob, JobStatus, JobStage } from "./types";

const jobs = new Map<string, ExtractionJob>();

const JOB_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
const JOB_CLEANUP_MS = 30 * 60 * 1000; // 30 minutes

// Cleanup interval — runs every 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, job] of jobs) {
        // Timeout processing jobs
        if (job.status === "processing" && now - job.createdAt > JOB_TIMEOUT_MS) {
          job.status = "failed";
          job.error = "Extraction timed out.";
        }
        // Remove old jobs
        if (now - job.createdAt > JOB_CLEANUP_MS) {
          jobs.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }
}

export const jobManager = {
  create(userId: string, url: string): ExtractionJob {
    ensureCleanup();
    const job: ExtractionJob = {
      id: createId(),
      userId,
      url,
      status: "pending",
      stage: null,
      result: null,
      error: null,
      platform: null,
      linkedBlogUrl: null,
      createdAt: Date.now(),
    };
    jobs.set(job.id, job);
    return job;
  },

  get(id: string): ExtractionJob | null {
    return jobs.get(id) ?? null;
  },

  updateStage(id: string, status: JobStatus, stage: JobStage) {
    const job = jobs.get(id);
    if (job) {
      job.status = status;
      job.stage = stage;
    }
  },

  complete(id: string, result: ExtractedRecipe, platform: string, linkedBlogUrl?: string) {
    const job = jobs.get(id);
    if (job) {
      job.status = "completed";
      job.stage = "complete";
      job.result = result;
      job.platform = platform;
      job.linkedBlogUrl = linkedBlogUrl ?? null;
    }
  },

  fail(id: string, error: string) {
    const job = jobs.get(id);
    if (job) {
      job.status = "failed";
      job.error = error;
    }
  },

  clear() {
    jobs.clear();
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/extraction/job-manager.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/extraction/job-manager.ts src/lib/extraction/job-manager.test.ts
git commit -m "feat: add in-memory extraction job manager with timeout and cleanup"
```

---

## Task 5: Playwright Browser Manager

**Files:**
- Create: `src/lib/extraction/browser.ts`

- [ ] **Step 1: Create browser manager**

```typescript
// src/lib/extraction/browser.ts
import { chromium, type Browser } from "playwright";

let browser: Browser | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  }, IDLE_TIMEOUT_MS);
}

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  resetIdleTimer();
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (idleTimer) clearTimeout(idleTimer);
  if (browser) {
    await browser.close();
    browser = null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/extraction/browser.ts
git commit -m "feat: add shared Playwright browser manager with idle timeout"
```

---

## Task 6: YouTube Adapter

**Files:**
- Create: `src/lib/extraction/adapters/youtube.ts`

- [ ] **Step 1: Create YouTube adapter**

```typescript
// src/lib/extraction/adapters/youtube.ts
import { YoutubeTranscript } from "youtube-transcript";
import type { PlatformAdapter, PlatformContent } from "../types";

export const youtubeAdapter: PlatformAdapter = {
  name: "youtube",

  async extract(url: string): Promise<PlatformContent> {
    // Fetch transcript (free, no API key needed)
    let transcriptText = "";
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      transcriptText = transcript.map((t) => t.text).join(" ");
    } catch {
      // Transcript not available (disabled, live video, etc.)
    }

    // Fetch page metadata via oEmbed (free, no key needed)
    let title = "";
    let author = "";
    let thumbnailUrl = "";
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const data = await res.json();
        title = data.title ?? "";
        author = data.author_name ?? "";
        thumbnailUrl = data.thumbnail_url ?? "";
      }
    } catch {
      // oEmbed failed
    }

    // Fetch page for description via meta tags
    let description = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBook/1.0)" },
        signal: AbortSignal.timeout(10_000),
      });
      const html = await res.text();
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*?)"/i);
      if (descMatch) description = descMatch[1];
    } catch {
      // Page fetch failed
    }

    const text = [title, description, transcriptText].filter(Boolean).join("\n\n");
    const images = thumbnailUrl ? [thumbnailUrl] : [];

    return {
      text,
      images,
      videoUrl: null, // YouTube transcripts don't need video download
      metadata: {
        author,
        platform: "youtube",
        originalUrl: url,
      },
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/extraction/adapters/youtube.ts
git commit -m "feat: add YouTube adapter with transcript and oEmbed metadata"
```

---

## Task 7: Video Downloader

**Files:**
- Create: `src/lib/extraction/video-downloader.ts`

- [ ] **Step 1: Create video downloader**

```typescript
// src/lib/extraction/video-downloader.ts
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface DownloadResult {
  filePath: string;
  cleanup: () => Promise<void>;
}

/**
 * Download a video URL to a temp file.
 * Returns the file path and a cleanup function.
 * Throws if download fails or file is too large.
 */
export async function downloadVideo(
  videoUrl: string,
  jobId: string
): Promise<DownloadResult> {
  const filePath = join(tmpdir(), `recipe-video-${jobId}.mp4`);

  const res = await fetch(videoUrl, {
    signal: AbortSignal.timeout(60_000), // 60s timeout for download
  });

  if (!res.ok) {
    throw new Error(`Video download failed: HTTP ${res.status}`);
  }

  const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error("Video file too large (max 100MB)");
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Video file too large (max 100MB)");
  }

  await writeFile(filePath, buffer);

  return {
    filePath,
    cleanup: async () => {
      try { await unlink(filePath); } catch { /* ignore */ }
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/extraction/video-downloader.ts
git commit -m "feat: add video downloader with size limit and temp file cleanup"
```

---

## Task 8: Whisper Transcriber

**Files:**
- Create: `src/lib/extraction/transcriber.ts`

- [ ] **Step 1: Create transcriber (direct fetch, no SDK)**

```typescript
// src/lib/extraction/transcriber.ts
import { readFile } from "fs/promises";
import type { TranscriptionProvider } from "./types";

export class WhisperTranscriber implements TranscriptionProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    const blob = new Blob([fileBuffer], { type: "audio/mp4" });

    const form = new FormData();
    form.append("file", blob, "video.mp4");
    form.append("model", "whisper-1");
    form.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(120_000), // 2 min timeout for transcription
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Whisper API error (${res.status}): ${errText}`);
    }

    return await res.text();
  }
}

/**
 * Get a transcriber instance, or null if no API key is configured.
 */
export function getTranscriber(): TranscriptionProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new WhisperTranscriber(apiKey);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/extraction/transcriber.ts
git commit -m "feat: add Whisper transcriber via direct OpenAI API fetch"
```

---

## Task 9: AI Recipe Structurer

**Files:**
- Create: `src/lib/extraction/recipe-structurer.ts`

- [ ] **Step 1: Create recipe structurer**

```typescript
// src/lib/extraction/recipe-structurer.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedRecipe } from "@/types";
import type { RecipeStructurerInterface, StructuringInput } from "./types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export class AnthropicRecipeStructurer implements RecipeStructurerInterface {
  async structure(content: StructuringInput): Promise<ExtractedRecipe> {
    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Extract the recipe from this ${content.platform} content. Return ONLY valid JSON matching this exact shape:

{
  "title": "Recipe Title",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "images": [],
  "suggestedMealTypes": ["Dinner"],
  "suggestedCuisines": ["Italian"],
  "suggestedDietary": ["Vegetarian"],
  "suggestedCookTimeMinutes": 45,
  "servings": 4,
  "substitutions": [],
  "storageTips": "",
  "makeAheadNotes": "",
  "servingSuggestions": "",
  "techniqueNotes": ""
}

Rules:
- Only extract what is explicitly stated. Do NOT invent ingredients or steps.
- Separate ingredients from instructions (video transcripts often interleave them).
- Use null for suggestedCookTimeMinutes and servings if not mentioned.
- Use empty string for text fields and empty array for list fields if not available.
- Suggest meal types from: Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer.
- Suggest cuisines from: Italian, Mexican, Thai, Japanese, Indian, French, American, Mediterranean, Chinese, Korean, Vietnamese, Middle Eastern, Greek, Other.
- Suggest dietary from: Vegan, Vegetarian, Gluten-Free, Dairy-Free, Keto, Paleo, Nut-Free, Low-Carb.

Content from ${content.platform} (${content.originalUrl}):

${content.text}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Merge AI-extracted data with images from the adapter
    return {
      title: parsed.title || "Untitled Recipe",
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
      images: content.images, // Use adapter images, not AI-generated
      suggestedMealTypes: Array.isArray(parsed.suggestedMealTypes) ? parsed.suggestedMealTypes : [],
      suggestedCuisines: Array.isArray(parsed.suggestedCuisines) ? parsed.suggestedCuisines : [],
      suggestedDietary: Array.isArray(parsed.suggestedDietary) ? parsed.suggestedDietary : [],
      suggestedCookTimeMinutes: parsed.suggestedCookTimeMinutes ?? null,
      servings: parsed.servings ?? null,
      substitutions: Array.isArray(parsed.substitutions) ? parsed.substitutions : [],
      storageTips: parsed.storageTips || "",
      makeAheadNotes: parsed.makeAheadNotes || "",
      servingSuggestions: parsed.servingSuggestions || "",
      techniqueNotes: parsed.techniqueNotes || "",
    };
  }
}

export function getStructurer(): RecipeStructurerInterface | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new AnthropicRecipeStructurer();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/extraction/recipe-structurer.ts
git commit -m "feat: add AI recipe structurer via Anthropic with provider-agnostic interface"
```

---

## Task 10: Social Media Adapters (Instagram, Twitter, Pinterest, Facebook)

**Files:**
- Create: `src/lib/extraction/adapters/instagram.ts`
- Create: `src/lib/extraction/adapters/twitter.ts`
- Create: `src/lib/extraction/adapters/pinterest.ts`
- Create: `src/lib/extraction/adapters/facebook.ts`

- [ ] **Step 1: Create Instagram adapter**

```typescript
// src/lib/extraction/adapters/instagram.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const instagramAdapter: PlatformAdapter = {
  name: "instagram",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(3000); // Wait for JS rendering

      // Extract caption from meta or DOM
      let caption = await page.$eval(
        'meta[property="og:description"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      if (!caption) {
        caption = await page.$eval(
          '[data-testid="post-comment-root"] span',
          (el) => el.textContent ?? ""
        ).catch(() => "");
      }

      // Extract images
      const images = await page.$$eval(
        'meta[property="og:image"]',
        (els) => els.map((el) => el.getAttribute("content")).filter(Boolean) as string[]
      ).catch(() => []);

      // Extract video URL
      let videoUrl: string | null = null;
      videoUrl = await page.$eval(
        'meta[property="og:video"]',
        (el) => el.getAttribute("content")
      ).catch(() => null);

      if (!videoUrl) {
        videoUrl = await page.$eval(
          "video source",
          (el) => el.getAttribute("src")
        ).catch(() => null);
      }

      const author = await page.$eval(
        'meta[property="og:title"]',
        (el) => {
          const content = el.getAttribute("content") ?? "";
          const match = content.match(/^(.+?)\s+on\s+Instagram/i);
          return match ? match[1] : "";
        }
      ).catch(() => "");

      return {
        text: caption,
        images,
        videoUrl,
        metadata: { author, platform: "instagram", originalUrl: url },
      };
    } finally {
      await page.close();
    }
  },
};
```

- [ ] **Step 2: Create Twitter/X adapter**

```typescript
// src/lib/extraction/adapters/twitter.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const twitterAdapter: PlatformAdapter = {
  name: "twitter",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(5000); // Twitter is slow to render

      // Extract tweet text
      const tweetTexts = await page.$$eval(
        '[data-testid="tweetText"]',
        (els) => els.slice(0, 10).map((el) => el.textContent ?? "").filter(Boolean)
      ).catch(() => []);

      const text = tweetTexts.join("\n\n");

      // Extract images
      const images = await page.$$eval(
        'img[src*="pbs.twimg.com/media"]',
        (els) => els.map((el) => el.getAttribute("src")).filter(Boolean) as string[]
      ).catch(() => []);

      // Extract video URL from og:video
      const videoUrl = await page.$eval(
        'meta[property="og:video:url"]',
        (el) => el.getAttribute("content")
      ).catch(() => null);

      const author = await page.$eval(
        '[data-testid="User-Name"] a',
        (el) => el.textContent ?? ""
      ).catch(() => "");

      return {
        text,
        images,
        videoUrl,
        metadata: { author, platform: "twitter", originalUrl: url },
      };
    } finally {
      await page.close();
    }
  },
};
```

- [ ] **Step 3: Create Pinterest adapter**

```typescript
// src/lib/extraction/adapters/pinterest.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const pinterestAdapter: PlatformAdapter = {
  name: "pinterest",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(3000);

      // Extract description
      const description = await page.$eval(
        'meta[property="og:description"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const title = await page.$eval(
        'meta[property="og:title"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      // Extract image
      const imageUrl = await page.$eval(
        'meta[property="og:image"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const images = imageUrl ? [imageUrl] : [];

      // Check for linked blog URL (many pins link to source)
      const linkedBlogUrl = await page.$eval(
        'a[data-test-id="pin-action-link"], a[rel="nofollow noopener"]',
        (el) => {
          const href = el.getAttribute("href") ?? "";
          // Filter out pinterest internal links
          if (href.includes("pinterest.com")) return "";
          return href;
        }
      ).catch(() => "");

      return {
        text: [title, description].filter(Boolean).join("\n\n"),
        images,
        videoUrl: null,
        metadata: { platform: "pinterest", originalUrl: url },
        ...(linkedBlogUrl ? { linkedBlogUrl } : {}),
      };
    } finally {
      await page.close();
    }
  },
};
```

- [ ] **Step 4: Create Facebook adapter**

```typescript
// src/lib/extraction/adapters/facebook.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const facebookAdapter: PlatformAdapter = {
  name: "facebook",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(3000);

      // Detect login wall
      const hasLoginWall = await page.$('form[action*="login"]').catch(() => null);
      if (hasLoginWall) {
        throw new Error("This Facebook post requires login. Try copying the recipe text and using manual entry.");
      }

      // Extract from meta tags (most reliable for Facebook)
      const description = await page.$eval(
        'meta[property="og:description"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const title = await page.$eval(
        'meta[property="og:title"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const imageUrl = await page.$eval(
        'meta[property="og:image"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const videoUrl = await page.$eval(
        'meta[property="og:video"]',
        (el) => el.getAttribute("content")
      ).catch(() => null);

      const images = imageUrl ? [imageUrl] : [];

      return {
        text: [title, description].filter(Boolean).join("\n\n"),
        images,
        videoUrl,
        metadata: { platform: "facebook", originalUrl: url },
      };
    } finally {
      await page.close();
    }
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/extraction/adapters/
git commit -m "feat: add Instagram, Twitter/X, Pinterest, and Facebook adapters"
```

---

## Task 11: Extraction Pipeline

Orchestrates: platform adapter → video download → transcription → AI structuring.

**Files:**
- Create: `src/lib/extraction/pipeline.ts`

- [ ] **Step 1: Create pipeline**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/extraction/pipeline.ts
git commit -m "feat: add extraction pipeline orchestrating adapter, download, transcription, and AI structuring"
```

---

## Task 12: Update Extract API Route

**Files:**
- Modify: `src/app/api/extract/route.ts`
- Create: `src/app/api/extract/[jobId]/route.ts`

- [ ] **Step 1: Update POST /api/extract with platform detection and async path**

Read the current file first. The key changes:
1. Import `detectPlatform`, `isSocialMedia` from `@/lib/extraction/platform-detector`
2. Import `jobManager` from `@/lib/extraction/job-manager`
3. Import `runExtractionPipeline` from `@/lib/extraction/pipeline`
4. After URL validation, detect platform
5. If blog: run existing Cheerio extraction (wrap response in `{ type: "immediate", ... }`)
6. If social: create job, fire-and-forget pipeline, return `{ type: "async", jobId, status: "processing" }`
7. On job failure, decrement rate limit count

Replace the full file:

```typescript
// src/app/api/extract/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapePage, extractRecipeFromPage } from "@/lib/scraper";
import { detectPlatform, isSocialMedia } from "@/lib/extraction/platform-detector";
import { jobManager } from "@/lib/extraction/job-manager";
import { runExtractionPipeline } from "@/lib/extraction/pipeline";

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

function decrementRateLimit(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const entry = rateLimitMap.get(userId);
  if (entry && entry.date === today && entry.count > 0) {
    entry.count--;
  }
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

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  const platform = detectPlatform(url);

  // Social media: async pipeline
  if (isSocialMedia(platform)) {
    const job = jobManager.create(user.id, url);

    // Fire-and-forget — pipeline runs in background
    runExtractionPipeline(job.id, url, platform).catch((err) => {
      console.error("Pipeline error:", err);
      jobManager.fail(job.id, "Extraction failed unexpectedly");
      decrementRateLimit(user.id);
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
          return NextResponse.json(
            { error: "Could not extract a recipe from this page. Try a different URL or use manual entry." },
            { status: 422 }
          );
        }
      }

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
        const message = err instanceof Error ? err.message : "Extraction failed";
        return NextResponse.json(
          { error: `Failed to extract recipe: ${message}` },
          { status: 500 }
        );
      }
    }
  }
}
```

- [ ] **Step 2: Create poll endpoint**

```typescript
// src/app/api/extract/[jobId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobManager } from "@/lib/extraction/job-manager";
import type { JobPollResponse } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = jobManager.get(jobId);
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const response: JobPollResponse = {
    status: job.status,
    stage: job.stage,
    recipe: job.result,
    sourceUrl: job.status === "completed" ? job.url : null,
    _meta: job.status === "completed" && job.platform
      ? { method: "social-media", platform: job.platform }
      : null,
    error: job.error,
    linkedBlogUrl: job.linkedBlogUrl,
  };

  return NextResponse.json(response);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/extract/route.ts src/app/api/extract/[jobId]/route.ts
git commit -m "feat: update extract API with platform detection, async jobs, and poll endpoint"
```

---

## Task 13: Update ImportForm with Polling

**Files:**
- Modify: `src/components/recipes/ImportForm.tsx`

- [ ] **Step 1: Update handleExtract to handle discriminated response**

Read the current ImportForm.tsx. The `handleExtract` function currently does:
```typescript
const data = await res.json();
const recipe = data as ExtractedRecipe;
```

Replace the extraction handling section (after `const data = await res.json()` and the error check) with:

```typescript
// Check if async (social media) or immediate (blog)
if (data.type === "async") {
  // Start polling
  setJobId(data.jobId);
  setExtracting(false);
  setPolling(true);
  return;
}

// Immediate result (blog)
const recipe = data.type === "immediate" ? data.recipe : data as ExtractedRecipe;
setPlatformBadge(data._meta?.platform ?? null);
```

- [ ] **Step 2: Add polling state and logic**

Add new state variables after existing ones:

```typescript
const [polling, setPolling] = useState(false);
const [jobId, setJobId] = useState<string | null>(null);
const [extractionStage, setExtractionStage] = useState<string | null>(null);
const [platformBadge, setPlatformBadge] = useState<string | null>(null);
```

Add a `useEffect` for polling:

```typescript
useEffect(() => {
  if (!polling || !jobId) return;

  const startTime = Date.now();
  const POLL_INTERVAL = 2000;
  const POLL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const interval = setInterval(async () => {
    if (Date.now() - startTime > POLL_TIMEOUT) {
      clearInterval(interval);
      setPolling(false);
      setExtractError("Extraction timed out. Try a different URL or use manual entry.");
      return;
    }

    try {
      const res = await fetch(`/api/extract/${jobId}`);
      const data = await res.json();

      setExtractionStage(data.stage);

      if (data.status === "completed" && data.recipe) {
        clearInterval(interval);
        setPolling(false);
        setPlatformBadge(data._meta?.platform ?? null);
        populateRecipeFields(data.recipe);
      } else if (data.status === "failed") {
        clearInterval(interval);
        setPolling(false);
        setExtractError(data.error || "Extraction failed");
      }
    } catch {
      // Network error — keep polling
    }
  }, POLL_INTERVAL);

  return () => clearInterval(interval);
}, [polling, jobId]);
```

- [ ] **Step 3: Extract field population into a shared function**

Create a `populateRecipeFields` function that both the immediate and polled paths use:

```typescript
function populateRecipeFields(recipe: ExtractedRecipe) {
  setExtracted(recipe);
  setTitle(recipe.title);
  setIngredients(recipe.ingredients.join("\n"));
  setInstructions(recipe.instructions.join("\n"));
  setCookTime(recipe.suggestedCookTimeMinutes?.toString() ?? "");
  setImages(recipe.images);
  setMealTypes(recipe.suggestedMealTypes);
  setCuisines(recipe.suggestedCuisines);
  setDietary(recipe.suggestedDietary);
  setServings(recipe.servings?.toString() ?? "");
  setSubstitutions(
    recipe.substitutions?.map((s) => ({
      ingredient: s.ingredient,
      substitute: s.substitute,
      notes: s.notes ?? "",
    })) ?? []
  );
  setStorageTips(recipe.storageTips ?? "");
  setMakeAheadNotes(recipe.makeAheadNotes ?? "");
  setServingSuggestions(recipe.servingSuggestions ?? "");
  setTechniqueNotes(recipe.techniqueNotes ?? "");
}
```

- [ ] **Step 4: Add polling UI in the Step 1 section**

After the existing extracting spinner, add a polling state view. When `polling` is true, show:

```tsx
{polling && (
  <div className="space-y-4 text-center">
    <Spinner />
    <p className="font-serif text-lg text-gray-600">
      {extractionStage === "fetching" && "Fetching page..."}
      {extractionStage === "downloading" && "Downloading video..."}
      {extractionStage === "transcribing" && "Transcribing video... (this may take a moment)"}
      {extractionStage === "extracting" && "Extracting recipe from content..."}
      {(!extractionStage || extractionStage === "detecting") && "Starting extraction..."}
    </p>
    <button
      onClick={() => { setPolling(false); setJobId(null); }}
      className="font-sans text-xs text-gray-500 hover:text-black transition-colors"
    >
      Cancel
    </button>
  </div>
)}
```

- [ ] **Step 5: Add platform badge in the review step**

After the "Review Recipe" heading, add:

```tsx
{platformBadge && platformBadge !== "blog" && (
  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-500 text-center mb-4">
    Extracted from {platformBadge}
  </p>
)}
```

- [ ] **Step 6: Add `useEffect` import if not present and `ExtractedRecipe` type import**

The file already imports `useState` from React. Add `useEffect` to that import. Also add the `useRef` import if the polling needs it (it uses `setInterval` cleanup via `useEffect` return, so no ref needed).

- [ ] **Step 7: Commit**

```bash
git add src/components/recipes/ImportForm.tsx
git commit -m "feat: add polling mode to ImportForm for social media extraction progress"
```

---

## Task 14: Final Build Verification

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All tests pass (existing 28 + platform detector 6 + job manager 6 = 40).

- [ ] **Step 2: Run TypeScript type check**

```bash
pnpm exec tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: Build succeeds (Playwright is a runtime dependency, not needed at build time).

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues from social media extraction implementation"
```

---

## Deferred Items & Known Spec Deviations

- **Image download during extraction** — the spec calls for downloading social media images during extraction (while Playwright session is active) to handle ephemeral CDN URLs. Deferred to a follow-up — `uploadRecipeImages` on save may still work for many platforms. Instagram and Twitter CDN URLs are most likely to expire; if this is a problem in practice, add image download to those adapters' extract methods. **This is a known deviation from the spec.**
- **Video duration check** — the spec says "Max duration: 10 minutes (skip if longer)." Duration detection requires `ffprobe` or similar tooling. Deferred — the 100MB file size limit serves as a practical proxy. **Known deviation from spec.**
- **Server-side job cancellation** — cancel is client-side only (stop polling). Server processing continues and cleans up naturally.
- **Adapter retry logic** — Instagram and other platforms may block requests intermittently. Retry logic per adapter is deferred.
- **TikTok adapter** — same pattern as Instagram adapter, can be added later.

# Social Media Recipe Extraction — Design Spec

> Extend the recipe import pipeline to extract recipes from Instagram, YouTube, Twitter/X, Pinterest, and Facebook — in addition to existing blog support. Uses a unified pipeline with platform-specific adapters, async job processing, video transcription via Whisper, and AI-powered recipe structuring.

---

## Architecture Overview

A single extraction pipeline with pluggable platform adapters. The pipeline: **detect platform → adapter fetches content → transcribe if video → AI structures recipe → return ExtractedRecipe**.

Blog extraction remains synchronous and fast (Cheerio + JSON-LD). Social media extraction is async: the API returns a job ID, the client polls for progress and results.

### Pipeline Flow

```
URL → Platform Detector
        │
        ├── Blog → Cheerio + JSON-LD (existing, synchronous) → ExtractedRecipe
        │
        └── Social Media → Create Job → Async Pipeline:
                             │
                             ├── Platform Adapter (Playwright) → PlatformContent
                             │     └── text, images, videoUrl, metadata
                             │
                             ├── Video Download (if videoUrl present)
                             │     └── temp file /tmp/recipe-video-{jobId}.mp4
                             │
                             ├── Whisper Transcription (if video downloaded)
                             │     └── plain text transcript
                             │
                             └── AI Recipe Structurer → ExtractedRecipe
                                   └── provider-agnostic, Anthropic default
```

---

## Platform Detection & Adapter Interface

### URL Detection

| Pattern | Adapter | Content Strategy |
|---------|---------|-----------------|
| `youtube.com`, `youtu.be` | YouTube | Transcript package + description + metadata. No Playwright needed. |
| `instagram.com` | Instagram | Playwright render → caption + video download → Whisper |
| `twitter.com`, `x.com` | Twitter/X | Playwright render → tweet text + images + video if present |
| `pinterest.com`, `pin.it` | Pinterest | Playwright render → pin description + images. Detects linked blog URLs. |
| `facebook.com`, `fb.com` | Facebook | Playwright render → post text + images + video. Detects login walls. |
| Everything else | Blog (existing) | Cheerio + JSON-LD (current scraper, no changes) |

### Adapter Interface

```typescript
interface PlatformContent {
  text: string;           // caption, description, tweet text, transcript
  images: string[];       // image URLs
  videoUrl: string | null; // downloadable video URL if found
  metadata: {
    author?: string;
    platform: string;
    originalUrl: string;
  };
}

interface PlatformAdapter {
  detect(url: string): boolean;
  extract(url: string): Promise<PlatformContent>;
}
```

The blog adapter is special — it returns `ExtractedRecipe` directly via the existing Cheerio pipeline, skipping AI structuring. Social adapters return `PlatformContent` which flows through the AI structuring step.

---

## Async Job System

### Job Lifecycle

`pending` → `processing` (with stages) → `completed` | `failed`

### Processing Stages

1. `detecting` — identifying platform
2. `fetching` — Playwright/Cheerio loading the page
3. `downloading` — downloading video (if applicable)
4. `transcribing` — Whisper speech-to-text (if video)
5. `extracting` — AI structuring the recipe
6. `complete` — recipe ready

### Job Storage

In-memory `Map<string, ExtractionJob>` — jobs are short-lived and ephemeral. Automatic cleanup after 30 minutes.

**Deployment constraint:** The async job system and Playwright browser require a **long-lived server process** (not serverless/edge). This feature is incompatible with Vercel serverless functions. Deploy on a Node.js server (Railway, Fly.io, VPS) or run a separate extraction microservice. The main app can still be on Vercel — the extract endpoint would be proxied to the extraction service.

```typescript
interface ExtractionJob {
  id: string;
  userId: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  stage: string | null;
  result: ExtractedRecipe | null;
  error: string | null;
  createdAt: number;
}
```

**Job timeout:** Jobs that have not completed within 5 minutes are automatically marked as `failed` with error "Extraction timed out." Client polling should also implement a 5-minute client-side timeout.

### API Response Contract

The `POST /api/extract` endpoint returns a discriminated union:

```typescript
// Blog extraction (synchronous)
type ExtractResponse =
  | {
      type: "immediate";
      recipe: ExtractedRecipe;
      sourceUrl: string;
      _meta: { method: string; platform: "blog" };
    }
  // Social media extraction (async)
  | {
      type: "async";
      jobId: string;
      status: "processing";
    };

// GET /api/extract/[jobId] poll response
interface JobPollResponse {
  status: "processing" | "completed" | "failed";
  stage: string | null;
  recipe: ExtractedRecipe | null;  // present when completed
  sourceUrl: string | null;
  _meta: { method: string; platform: string } | null;
  error: string | null;
  linkedBlogUrl: string | null;  // Pinterest: link to original blog
}
```

The client uses the `type` field to distinguish between immediate and async responses.

### API Endpoints

- `POST /api/extract` — detects platform. If blog, runs synchronous Cheerio extraction (current fast path preserved), returns `{ type: "immediate", ... }`. If social media, creates a job, kicks off async processing, returns `{ type: "async", jobId, status: "processing" }`.
- `GET /api/extract/[jobId]/route.ts` — poll endpoint. Returns `JobPollResponse` with current status, stage, and result when complete.

### Rate Limiting

Rate limiting applies to both paths (existing in-memory rate limiter). Failed async jobs **do not** count against the rate limit — the count is decremented if a job fails. This prevents users from losing quota on platform-side failures they can't control.

---

## Video Download & Transcription

### Video Download

Each social adapter extracts the video URL from the rendered page. Platform-specific strategies:

- **YouTube** — no video download needed for transcripts. Uses `youtube-transcript` npm package (free, no API key). Falls back to video download + Whisper only if no transcript available.
- **Instagram** — extracts video source from `<video>` tag or `og:video` meta tag after Playwright render.
- **Twitter/X** — extracts video URL from rendered page.
- **Facebook** — extracts from `og:video` or video player source.
- **Pinterest** — rarely has video; mostly images + description.

### Download Mechanics

- Server-side `fetch()` to download video to temp file (`/tmp/recipe-video-{jobId}.mp4`)
- Max file size: 100MB (skip transcription if larger)
- Max duration: 10 minutes (skip if longer)
- Temp files cleaned up after job completes

### Transcription

Provider-agnostic interface, OpenAI Whisper as default:

```typescript
interface TranscriptionProvider {
  transcribe(filePath: string): Promise<string>;
}
```

Default implementation calls `POST https://api.openai.com/v1/audio/transcriptions` with the video file.

### Fallback Chain

If transcription fails or no video is present, the pipeline continues with text-only content (caption, description). AI structuring works with whatever content is available. A caption-only extraction is better than no extraction.

### Environment Variables

```
OPENAI_API_KEY=  # For Whisper transcription
```

---

## AI Recipe Structuring

Runs only for social media URLs. Blog extraction continues using JSON-LD/Cheerio directly.

### Provider-Agnostic Interface

```typescript
interface RecipeStructurer {
  structure(content: StructuringInput): Promise<ExtractedRecipe>;
}

interface StructuringInput {
  text: string;         // combined caption + transcript
  images: string[];     // available image URLs
  platform: string;     // source platform for context
  originalUrl: string;
}
```

### Default Implementation

Anthropic API via `@anthropic-ai/sdk` (must be added as a dependency). Uses Claude Haiku for cost efficiency.

### Prompt Strategy

The prompt provides combined text (caption + transcript) and asks the model to extract the standard `ExtractedRecipe` shape: title, ingredients, instructions, suggested tags, cook time, servings, substitutions, storage tips. Instructions to the model:

- Only extract what's explicitly stated (don't invent ingredients)
- Separate ingredients from instructions (transcripts often interleave them)
- Suggest tags based on content
- Return `null` for fields it can't determine

### Fallback Chain

1. Try AI structuring with full content (transcript + caption)
2. If AI fails, try with caption only
3. If that fails, return a partial result with just the title and images — user can manually enter the recipe

### Image Handling

Social media images are downloaded **during extraction** (while the Playwright session is active) rather than deferred to save time. Social media CDN URLs are often ephemeral or token-gated and may expire before the user saves. Downloaded images are stored as temp files alongside the video, then passed as local file paths. The existing `uploadRecipeImages` flow on save uploads them to Supabase Storage. If image download fails during extraction, the CDN URL is passed through as a fallback (may or may not work at save time).

---

## Platform Adapter Details

### Playwright Management

Shared browser instance, lazily initialized and reused across requests. Not started for blog URLs. Auto-closes after 5 minutes of inactivity.

```typescript
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}
```

### YouTube Adapter

- Does NOT use Playwright — uses `youtube-transcript` package (free, no API key)
- Falls back to page description if transcript unavailable
- Extracts: transcript text, description, title, thumbnail images, duration
- Fastest social adapter since no browser or video download needed

### Instagram Adapter

- Playwright navigates to the post URL
- Extracts caption from `meta[property="og:description"]` or rendered DOM
- Extracts video URL from `og:video` meta or `<video>` source
- If video found: download → Whisper transcribe
- If image post: extract caption only, pass images
- Note: Instagram aggressively blocks scraping — requires retry logic, least reliable adapter

### Twitter/X Adapter

- Playwright renders the tweet (tweets are JS-rendered)
- Extracts tweet text from rendered DOM
- Extracts images from `img[src*="pbs.twimg.com"]`
- If video tweet: extract video URL from player, download → Whisper
- Thread support: if URL points to a tweet in a thread, extract tweets by the original author only (ignore replies from others). Scope limited to the first 10 tweets in a thread to bound extraction time.

### Pinterest Adapter

- Playwright renders the pin page
- Extracts pin description and title
- Extracts high-res image
- **Key insight:** Many Pinterest pins link back to the original blog post. If a source URL is detected, the extraction result includes a `linkedBlogUrl` suggestion so the client can offer to re-extract from the original blog (fast Cheerio path)

### Facebook Adapter

- Playwright renders the post
- Extracts post text from rendered DOM
- Extracts images and video if present
- Detects login walls — Facebook aggressively gates content behind login. Returns clear error: "This Facebook post requires login. Try copying the recipe text and using manual entry."

### Error Handling Per Adapter

- Anti-scraping blocks → "Platform blocked access. Try again later or use manual entry."
- Login walls → "This content requires authentication. Try copying the text manually."
- Content not found → "No content found at this URL."

---

## Client-Side Changes

### ImportForm Updates

The URL input and review/edit form stay the same. The change is in the intermediate state:

1. User pastes URL, clicks "Extract Recipe"
2. `POST /api/extract` — detects platform
3. **Blog URL:** returns `ExtractedRecipe` immediately (current behavior, unchanged)
4. **Social URL:** returns `{ jobId, status: "processing" }`

### Polling Mode

When a `jobId` is returned, the form switches to a progress view:

- Progress indicator showing current stage with descriptive text:
  - "Fetching page from Instagram..."
  - "Downloading video..."
  - "Transcribing video... (this may take a moment)"
  - "Extracting recipe from content..."
- Polls `GET /api/extract/[jobId]` every 2 seconds
- On `completed`: populates the review/edit form (same as current blog flow)
- On `failed`: shows error with option to retry or use manual entry
- Cancel button to abort polling (client-side only — stops polling, does not cancel server processing. Server-side cancellation is deferred; the job will complete/fail on its own and be cleaned up by the 30-minute expiry.)
- Client-side timeout: if polling exceeds 5 minutes, stop and show "Extraction timed out" with manual entry option

### Platform Badge

After extraction, the review form shows a small badge indicating the source platform (e.g., "Extracted from YouTube") in the `_meta` response. Helps user understand extraction quality may vary by source.

### No Changes to Save Flow

Once the review form is populated, everything downstream (edit fields, tags, save to DB) works identically regardless of source.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `playwright` | Headless browser for social media page rendering |
| `youtube-transcript` | YouTube transcript extraction (no API key needed) |
| *(no SDK — direct fetch)* | Whisper API for video transcription (`POST openai.com/v1/audio/transcriptions`) |

| `@anthropic-ai/sdk` | AI recipe structuring (Anthropic Claude) — new, must be added |

Note: Use direct `fetch()` for the Whisper API endpoint rather than the full `openai` package, since only one endpoint is needed. This avoids pulling in a second large AI SDK.

### Environment Variables (New)

```
OPENAI_API_KEY=         # Required for Whisper video transcription
ANTHROPIC_API_KEY=      # Required for AI recipe structuring (also used by smart collections)
```

Both keys are optional — if missing, the relevant extraction step is skipped with graceful degradation.

---

## Scope Boundaries

**In scope:**
- Platform detection and routing
- Five social media adapters (YouTube, Instagram, Twitter/X, Pinterest, Facebook)
- Async job system with polling
- Video download and Whisper transcription
- AI recipe structuring with provider-agnostic interface
- Progress UI in ImportForm

**Out of scope:**
- Platform authentication/login (if content requires login, show error)
- TikTok (can be added as an adapter later)
- Video analysis via vision models (future enhancement)
- Batch extraction (one URL at a time)
- Caching extracted recipes from social media

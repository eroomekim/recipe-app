# Image-Based Recipe Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload photos or PDFs of recipes and extract structured recipe data using Claude vision.

**Architecture:** New `POST /api/extract/image` route handles multipart file uploads, converts HEIC→JPEG via `sharp`, sends images to Claude Sonnet vision API, parses the structured JSON response into `ExtractedRecipe`. The ImportForm gains a tab switcher toggling between "Paste URL" and "Upload Image" modes, both feeding into the existing Step 2 review/edit flow.

**Tech Stack:** Next.js App Router, Anthropic SDK (Claude Sonnet vision), sharp (HEIC conversion), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-03-23-image-recipe-extraction-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/extraction/image-extractor.ts` | Create | Claude vision API call, prompt, response parsing → `ExtractedRecipe` |
| `src/lib/extraction/image-extractor.test.ts` | Create | Tests for response parsing, validation, error handling |
| `src/app/api/extract/image/route.ts` | Create | Multipart upload endpoint, auth, rate limiting, HEIC conversion, delegates to image-extractor |
| `src/components/recipes/ImportForm.tsx` | Modify | Add tab switcher, dropzone UI, file upload state, image extraction flow |
| `src/app/api/extract/route.ts` | Modify | Filter rate limit count by type so image extractions don't count toward URL limit |
| `next.config.ts` | Modify | Add `sharp` to `serverExternalPackages`, increase body size limit |
| `package.json` | Modify | Add `sharp` dependency |

---

### Task 1: Install sharp dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sharp**

```bash
pnpm add sharp && pnpm add -D @types/sharp
```

- [ ] **Step 2: Verify installation**

```bash
node -e "const sharp = require('sharp'); console.log('sharp version:', sharp.versions.sharp)"
```

Expected: prints sharp version without error.

- [ ] **Step 3: Configure Next.js for sharp and large uploads**

Update `next.config.ts` to add `sharp` to `serverExternalPackages` and increase the body size limit for the image upload route:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Fix existing rate limiter to filter by type**

In `src/app/api/extract/route.ts`, update the `getTodayCount` function to only count URL-based extractions (blog/social), so image extractions don't eat into the URL extraction limit:

Change:
```typescript
async function getTodayCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.extractionLog.count({
    where: {
      userId,
      createdAt: { gte: startOfDay },
    },
  });
}
```

To:
```typescript
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
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts src/app/api/extract/route.ts
git commit -m "chore: add sharp, configure Next.js, fix rate limit filtering"
```

---

### Task 2: Image extractor — Claude vision integration

**Files:**
- Create: `src/lib/extraction/image-extractor.ts`
- Create: `src/lib/extraction/image-extractor.test.ts`

- [ ] **Step 1: Write test for `parseVisionResponse` — valid JSON**

Create `src/lib/extraction/image-extractor.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseVisionResponse } from "./image-extractor";

describe("parseVisionResponse", () => {
  it("parses a valid recipe JSON response", () => {
    const raw = JSON.stringify({
      title: "Italian Baked Cannelloni",
      ingredients: ["1/2 cup olive oil", "1 pound ground beef"],
      instructions: ["Preheat oven to 350°F", "Brown the meat"],
      suggestedMealTypes: ["Dinner"],
      suggestedCuisines: ["Italian"],
      suggestedDietary: [],
      suggestedCookTimeMinutes: 65,
      servings: 5,
    });

    const result = parseVisionResponse(raw);
    expect(result.title).toBe("Italian Baked Cannelloni");
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0]).toMatchObject({ text: "Preheat oven to 350°F" });
    expect(result.suggestedCookTimeMinutes).toBe(65);
    expect(result.nutrition).toBeNull();
    expect(result.images).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/extraction/image-extractor.test.ts
```

Expected: FAIL — `parseVisionResponse` not found.

- [ ] **Step 3: Write test for `parseVisionResponse` — JSON wrapped in markdown**

Add to the test file:

```typescript
  it("extracts JSON from markdown code fence", () => {
    const raw = '```json\n{"title":"Test","ingredients":[],"instructions":[]}\n```';
    const result = parseVisionResponse(raw);
    expect(result.title).toBe("Test");
  });
```

- [ ] **Step 4: Write test for `parseVisionResponse` — missing fields get defaults**

```typescript
  it("returns defaults for missing optional fields", () => {
    const raw = JSON.stringify({
      title: "Simple Recipe",
      ingredients: ["flour"],
      instructions: ["mix"],
    });
    const result = parseVisionResponse(raw);
    expect(result.suggestedMealTypes).toEqual([]);
    expect(result.suggestedCuisines).toEqual([]);
    expect(result.suggestedDietary).toEqual([]);
    expect(result.suggestedCookTimeMinutes).toBeNull();
    expect(result.servings).toBeNull();
    expect(result.substitutions).toEqual([]);
    expect(result.storageTips).toBe("");
    expect(result.makeAheadNotes).toBe("");
    expect(result.nutrition).toBeNull();
  });
```

- [ ] **Step 5: Write test for `parseVisionResponse` — no JSON found**

```typescript
  it("throws when no JSON is found in response", () => {
    expect(() => parseVisionResponse("I cannot extract a recipe from this image."))
      .toThrow("No recipe found");
  });
```

- [ ] **Step 6: Write test for `validateImageFiles`**

```typescript
import { validateImageFiles } from "./image-extractor";

describe("validateImageFiles", () => {
  it("rejects when no files provided", () => {
    expect(() => validateImageFiles([])).toThrow("Please upload at least one image");
  });

  it("rejects when too many files", () => {
    const files = Array.from({ length: 6 }, () => ({
      size: 1000,
      type: "image/jpeg",
      name: "test.jpg",
    })) as File[];
    expect(() => validateImageFiles(files)).toThrow("Maximum 5 files");
  });

  it("rejects files over 20MB", () => {
    const files = [{
      size: 21 * 1024 * 1024,
      type: "image/jpeg",
      name: "huge.jpg",
    }] as File[];
    expect(() => validateImageFiles(files)).toThrow("under 20MB");
  });

  it("rejects unsupported file types", () => {
    const files = [{
      size: 1000,
      type: "image/gif",
      name: "anim.gif",
    }] as File[];
    expect(() => validateImageFiles(files)).toThrow("Supported formats");
  });

  it("accepts valid files", () => {
    const files = [{
      size: 1000,
      type: "image/jpeg",
      name: "photo.jpg",
    }] as File[];
    expect(() => validateImageFiles(files)).not.toThrow();
  });

  it("accepts PDF files", () => {
    const files = [{
      size: 5000,
      type: "application/pdf",
      name: "recipe.pdf",
    }] as File[];
    expect(() => validateImageFiles(files)).not.toThrow();
  });
});
```

- [ ] **Step 7: Implement `image-extractor.ts`**

Create `src/lib/extraction/image-extractor.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedRecipe } from "@/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export function validateImageFiles(
  files: { size: number; type: string; name: string }[]
): void {
  if (files.length === 0) {
    throw new Error("Please upload at least one image");
  }
  if (files.length > MAX_FILES) {
    throw new Error(`Maximum ${MAX_FILES} files allowed`);
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Each file must be under 20MB (${file.name} is too large)`);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error("Supported formats: JPEG, PNG, WebP, HEIC, PDF");
    }
  }
}

export function parseVisionResponse(text: string): ExtractedRecipe {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "");
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No recipe found in the uploaded images");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Wrap instruction strings into { text } objects
  const instructions = Array.isArray(parsed.instructions)
    ? parsed.instructions.map((inst: string | { text: string }) =>
        typeof inst === "string" ? { text: inst } : inst
      )
    : [];

  return {
    title: parsed.title || "Untitled Recipe",
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    instructions,
    images: [], // No downloadable images from photographed recipes
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
    nutrition: null,
  };
}

const VISION_PROMPT = `Extract the complete recipe from the provided image(s). These may be photos of printed recipes, cookbook pages, handwritten recipe cards, or scanned documents.

Return ONLY valid JSON matching this exact shape:

{
  "title": "Recipe Title",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
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
- If multiple images are provided, combine them into a single complete recipe.
- Only extract what is explicitly written. Do NOT invent ingredients or steps.
- Use null for suggestedCookTimeMinutes and servings if not stated.
- Use empty string for text fields and empty array for list fields if not available.
- Suggest meal types from: Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer.
- Suggest cuisines from: Italian, Mexican, Thai, Japanese, Indian, French, American, Mediterranean, Chinese, Korean, Vietnamese, Middle Eastern, Greek, Other.
- Suggest dietary from: Vegan, Vegetarian, Gluten-Free, Dairy-Free, Keto, Paleo, Nut-Free, Low-Carb.
- For cook time, convert any duration to total minutes (e.g., "1 hour 30 min" = 90).`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface PreparedFile {
  base64: string;
  mediaType: string; // "image/jpeg", "image/png", "image/webp", "application/pdf"
}

export async function extractRecipeFromImages(
  files: PreparedFile[]
): Promise<ExtractedRecipe> {
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  for (const file of files) {
    if (file.mediaType === "application/pdf") {
      contentBlocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: file.base64,
        },
      });
    } else {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mediaType as ImageMediaType,
          data: file.base64,
        },
      });
    }
  }

  contentBlocks.push({ type: "text", text: VISION_PROMPT });

  const message = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseVisionResponse(text);
}
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run src/lib/extraction/image-extractor.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/extraction/image-extractor.ts src/lib/extraction/image-extractor.test.ts
git commit -m "feat: add image recipe extractor with Claude vision"
```

---

### Task 3: API route for image extraction

**Files:**
- Create: `src/app/api/extract/image/route.ts`
- Reference: `src/app/api/extract/route.ts` (existing rate limiting pattern)
- Reference: `src/lib/extraction/image-extractor.ts` (from Task 2)

- [ ] **Step 1: Create the API route**

Create `src/app/api/extract/image/route.ts`:

```typescript
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

  // Detect actual format via sharp for images that may be misreported
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
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/extract/image/route.ts
git commit -m "feat: add API route for image-based recipe extraction"
```

---

### Task 4: Update ImportForm with tab switcher and image upload

**Files:**
- Modify: `src/components/recipes/ImportForm.tsx`

This is the largest task. The ImportForm needs:
1. Tab state (`"url" | "image"`)
2. File upload state and dropzone UI
3. Image extraction API call
4. Tab-aware `handleBack`
5. Tab-aware `handleSave` (omit `sourceUrl` for image imports)

- [ ] **Step 1: Add tab state and file upload state**

In `src/components/recipes/ImportForm.tsx`:

Add `Upload` to the lucide-react import at line 11:
```typescript
import { X, Upload } from "lucide-react";
```

Add `useMemo` to the React import at line 3:
```typescript
import { useState, useEffect, useMemo } from "react";
```

Add new state variables after the existing Step 1 state (after line 60):
```typescript
  // Import mode
  const [activeTab, setActiveTab] = useState<"url" | "image">("url");

  // Image upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "extracting">("idle");
```

Add a `useMemo` for thumbnail preview URLs (after the state declarations, to avoid memory leaks from `URL.createObjectURL`):
```typescript
  // Memoize object URLs for file thumbnails — avoids creating new URLs on every render
  const filePreviewUrls = useMemo(() => {
    return uploadedFiles.map((file) =>
      file.type === "application/pdf" ? null : URL.createObjectURL(file)
    );
  }, [uploadedFiles]);
```

- [ ] **Step 2: Add file handling functions**

Add after the `removeImage` function (after line 210):

```typescript
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  }

  function addFiles(newFiles: File[]) {
    const combined = [...uploadedFiles, ...newFiles].slice(0, 5);
    setUploadedFiles(combined);
    setExtractError(null);
  }

  function removeUploadedFile(index: number) {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  }
```

- [ ] **Step 3: Add `handleImageExtract` function**

Add after the `handleExtract` function (after line 196):

```typescript
  async function handleImageExtract(e: React.FormEvent) {
    e.preventDefault();
    if (uploadedFiles.length === 0) return;

    setExtractError(null);
    setUploadPhase("uploading");

    try {
      const formData = new FormData();
      uploadedFiles.forEach((file) => formData.append("files", file));

      setUploadPhase("extracting");
      const res = await fetch("/api/extract/image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setExtractError(data.error || "Image extraction failed");
        return;
      }

      populateRecipeFields(data.recipe);
    } catch {
      setExtractError("Failed to connect to server");
    } finally {
      setUploadPhase("idle");
    }
  }
```

- [ ] **Step 4: Update `handleSave` to omit `sourceUrl` for image imports**

Note: `handleBack` needs no changes — `activeTab` state persists since it's not reset, so "Back" returns to the correct tab.

In the `handleSave` function, change line 227 from:

```typescript
          sourceUrl: url,
```

to:

```typescript
          sourceUrl: activeTab === "url" ? url : undefined,
```

- [ ] **Step 5: Replace Step 1 UI with tabbed interface**

Replace the Step 1 block (the `if (!extracted)` return, lines 265-316) with the tabbed version:

```tsx
  // Step 1: URL or Image Input
  if (!extracted) {
    const isImageExtracting = uploadPhase !== "idle";

    return (
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold leading-none text-center mb-8">
          Import a Recipe
        </h1>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-300 mb-6">
          <button
            onClick={() => setActiveTab("url")}
            className={`flex-1 py-3 font-sans text-base font-bold uppercase tracking-normal transition-colors ${
              activeTab === "url"
                ? "text-black border-b-2 border-black"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Paste URL
          </button>
          <button
            onClick={() => setActiveTab("image")}
            className={`flex-1 py-3 font-sans text-base font-bold uppercase tracking-normal transition-colors ${
              activeTab === "image"
                ? "text-black border-b-2 border-black"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Upload Image
          </button>
        </div>

        {activeTab === "url" ? (
          /* URL tab — existing form */
          <form onSubmit={handleExtract} className="space-y-4">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a recipe URL..."
              required
            />

            {extractError && (
              <p className="font-sans text-sm text-red">{extractError}</p>
            )}

            <Button type="submit" loading={extracting} className="w-full">
              {extracting ? "Extracting recipe..." : "Extract Recipe"}
            </Button>

            {extracting && (
              <div className="flex items-center justify-center gap-2 text-gray-600 font-sans text-sm">
                <Spinner />
                <span>This may take a moment...</span>
              </div>
            )}

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
          </form>
        ) : (
          /* Image upload tab */
          <form onSubmit={handleImageExtract} className="space-y-4">
            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border border-dashed border-gray-300 hover:border-black hover:bg-gray-50 transition-colors p-8 text-center cursor-pointer"
              onClick={() => document.getElementById("image-file-input")?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-gray-500" />
              <p className="font-sans text-sm text-gray-600">
                Drag images here or tap to browse
              </p>
              <p className="font-sans text-xs text-gray-500 mt-1">
                JPEG, PNG, WebP, HEIC, or PDF — up to 5 files, 20MB each
              </p>
              <input
                id="image-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Thumbnail strip */}
            {uploadedFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {uploadedFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="relative shrink-0">
                    {file.type === "application/pdf" ? (
                      <div className="w-20 h-20 bg-gray-50 flex items-center justify-center">
                        <span className="font-sans text-xs text-gray-600 uppercase">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={filePreviewUrls[i] ?? ""}
                        alt={file.name}
                        className="w-20 h-20 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeUploadedFile(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white flex items-center justify-center"
                      aria-label="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {extractError && (
              <p className="font-sans text-sm text-red">{extractError}</p>
            )}

            <Button
              type="submit"
              loading={isImageExtracting}
              disabled={uploadedFiles.length === 0}
              className="w-full"
            >
              {uploadPhase === "uploading"
                ? "Uploading images..."
                : uploadPhase === "extracting"
                ? "Extracting recipe from image..."
                : "Extract Recipe"}
            </Button>

            {isImageExtracting && (
              <div className="flex items-center justify-center gap-2 text-gray-600 font-sans text-sm">
                <Spinner />
                <span>
                  {uploadPhase === "uploading"
                    ? "Uploading images..."
                    : "Analyzing images with AI..."}
                </span>
              </div>
            )}
          </form>
        )}
      </div>
    );
  }
```

- [ ] **Step 6: Run the dev server and verify UI**

```bash
npm run dev
```

Open `http://localhost:3000/import` and verify:
- Tab switcher appears with "Paste URL" and "Upload Image"
- URL tab works as before
- Image tab shows dropzone, can select files, shows thumbnails
- Remove buttons work on thumbnails

- [ ] **Step 7: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/recipes/ImportForm.tsx
git commit -m "feat: add image upload tab to import form"
```

---

### Task 5: End-to-end manual test and cleanup

**Files:**
- No new files — verification only

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: all existing tests pass, image-extractor tests pass.

- [ ] **Step 2: Run build**

```bash
pnpm run build
```

Expected: clean build, no errors.

- [ ] **Step 3: Manual E2E test with a real image**

1. Start dev server: `pnpm run dev`
2. Navigate to `/import`
3. Click "Upload Image" tab
4. Upload a photo of a recipe (JPEG or HEIC from phone)
5. Click "Extract Recipe"
6. Verify Step 2 populates with extracted title, ingredients, instructions
7. Verify "Back" returns to the Image tab (not URL tab)
8. Re-extract, then save — verify recipe appears in collection without a sourceUrl

- [ ] **Step 4: Test error cases**

1. Upload a non-recipe image (e.g., a landscape photo) — should show "No recipe found" error
2. Upload without selecting files — button should be disabled
3. Upload a file over 20MB — should show size error

- [ ] **Step 5: Final commit if any cleanup was needed**

```bash
git add <specific-files-that-changed>
git commit -m "fix: cleanup from E2E testing"
```

(Skip if no changes needed.)

# Image-Based Recipe Extraction

**Date:** 2026-03-23
**Status:** Approved

## Problem

Users can currently import recipes by pasting a URL. But many recipes exist as physical artifacts — printed pages, cookbook spreads, handwritten cards, magazine clippings. Users want to photograph these with their phone (or upload a scan/PDF) and have the app extract structured recipe data automatically.

## Solution

Add image/PDF upload to the existing `/import` page. Claude vision extracts structured recipe data from uploaded images, which feeds into the existing review/edit flow. No new pages, no changes to the save pipeline.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI provider | Claude (Anthropic) vision | Already integrated for social media extraction pipeline |
| UI location | Unified import page with tab switcher | Same `ExtractedRecipe` output shape; one place to import regardless of source |
| Image input | File upload + camera capture + multi-image | Covers photographing cookbooks (multi-page), cards (front/back), and existing photos |
| Formats | JPEG, PNG, WebP, HEIC/HEIF, PDF | HEIC covers native iPhone; PDF covers scanned pages |
| Processing | Synchronous | Single Claude API call; no pipeline stages like social media extraction |
| Rate limiting | Separate pool (10/day) from URL extraction (20/day) | Vision API is more expensive; independent cost control |
| Vision model | `claude-sonnet-4-20250514` | Handwritten/photographed text needs stronger OCR than Haiku; justifies separate rate limit |
| Nutrition extraction | Out of scope | Printed recipes rarely include structured nutrition; always returns `null` |

## UI Changes

### Import Page — Step 1

Add a tab switcher above the existing URL input:

```
  [Paste URL]    [Upload Image]
```

**"Paste URL" tab** — existing behavior, unchanged.

**"Upload Image" tab:**
- Dropzone area: "Drag images here or tap to browse"
- On mobile: file input with `accept="image/*,application/pdf" capture="environment"` to offer camera
- Thumbnail strip below dropzone showing selected files (removable)
- Constraints: max 5 files, max 20MB per file
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`, `application/pdf`
- "Extract Recipe" button triggers extraction
- Two-phase loading: "Uploading images..." during upload, then "Extracting recipe from image..." during Claude processing
- Error display for validation failures or extraction errors

**After extraction** — flows into the identical Step 2 review/edit form. No changes to Step 2.

### Design System Compliance

- Tab switcher uses sans-serif uppercase bold text (nav style)
- Active tab: black text with bottom border; inactive: gray-600
- Dropzone: dashed `border-gray-300` border, `bg-gray-50` on hover/drag
- Thumbnails: no rounded corners, no shadows (matching card pattern)
- Remove button on thumbnails: subtle X, top-right

## API

### `POST /api/extract/image`

New endpoint for image-based extraction.

**Request:** `multipart/form-data`
- Field `files`: one or more image/PDF files

**Response:** Returns an `ExtractedRecipe` directly (not wrapped in `ExtractResponse`), since this endpoint has no async variant:
```json
{
  "recipe": {
    "title": "Italian Baked Cannelloni",
    "ingredients": ["1/2 cup olive oil", "1 pound lean ground beef", "..."],
    "instructions": ["To make the Cannelloni Filling...", "Sear in hot Dutch oven..."],
    "images": [],
    "suggestedMealTypes": ["Dinner"],
    "suggestedCuisines": ["Italian"],
    "suggestedDietary": [],
    "suggestedCookTimeMinutes": 65,
    "servings": 5,
    "substitutions": [],
    "storageTips": "",
    "makeAheadNotes": "",
    "servingSuggestions": "",
    "techniqueNotes": "",
    "nutrition": null
  }
}
```

**Notes:**
- `images` array will be empty since physical recipes don't have downloadable image URLs. The user's uploaded photos are not stored as recipe images (they're photos *of* the recipe, not food photography).
- `instructions` are plain strings (no `imageUrl` field) since photographed recipes have no per-step images. The ImportForm wraps them into `{ text }` objects as needed.
- No `sourceUrl` — image imports have no source URL. The ImportForm must handle this (see "What Changes" section).
- No `ExtractResponse` type changes needed — the ImportForm calls this endpoint separately and handles the response shape directly.

### Server-Side Processing

1. **Authenticate** — Supabase session required
2. **Rate limit** — Separate counter: 10 image extractions/day per user
3. **Validate** — File count (max 5), file size (max 20MB each), MIME type check (with `sharp` buffer-based format detection as fallback, since iOS may report HEIC as `image/jpeg`)
4. **Convert HEIC** — Use `sharp` to convert HEIC/HEIF files to JPEG buffers
5. **Prepare for Claude** — Convert each file to base64, build content blocks:
   - Images: `{ type: "image", source: { type: "base64", media_type, data } }`
   - PDFs: `{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }`
6. **Call Claude vision API** — Single request using `claude-sonnet-4-20250514` with all images + extraction prompt
7. **Parse response** — Map Claude's JSON output to `ExtractedRecipe` shape
8. **Return** — Same response format as URL extraction

### Claude Vision Prompt

The system prompt instructs Claude to:
- Extract the complete recipe from all provided images/pages
- Return structured JSON matching `ExtractedRecipe` fields
- Handle multi-page recipes by combining data across all images
- Suggest meal types, cuisines, and dietary tags from predefined lists
- Parse cook time into minutes
- Handle handwritten, printed, and mixed-format recipes
- Return empty arrays/null for fields not present in the source
- Nutrition extraction is out of scope — always return `null` for nutrition

### Rate Limiting

Extend the existing in-memory rate limiter:

```
Existing: userId + date → URL extraction count (max 20/day)
New:      userId + date + "image" → image extraction count (max 10/day)
```

Same cleanup and reset behavior as current implementation.

## Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `sharp` | HEIC/HEIF → JPEG conversion, image validation | New dependency |
| `@anthropic-ai/sdk` | Claude vision API calls | Already installed |

No new external services. No database schema changes. No new environment variables (uses existing `ANTHROPIC_API_KEY`).

## What Changes

- **ImportForm component** — Add tab switcher, dropzone UI, file handling state, image extraction API call. Track active tab in state so "Back" from Step 2 returns to the correct tab. When saving from image import, omit `sourceUrl` (set to `undefined` instead of empty string).
- **New API route** — `POST /api/extract/image` with file upload handling. Must configure Next.js route segment config to increase body size limit (default is 1MB; needs ~100MB for 5x20MB files): `export const runtime = 'nodejs'` and custom body size config.
- **Rate limiter** — Extend to track image extractions separately
- **package.json** — Add `sharp` dependency

## What Stays the Same

- Step 2 review/edit form
- `ExtractedRecipe` type definition
- `POST /api/recipes` save flow
- Supabase image storage pipeline
- URL extraction flow and API
- Database schema

## Error Handling

| Error | Response |
|-------|----------|
| No files uploaded | 400: "Please upload at least one image" |
| Too many files | 400: "Maximum 5 files allowed" |
| File too large | 400: "Each file must be under 20MB" |
| Invalid file type | 400: "Supported formats: JPEG, PNG, WebP, HEIC, PDF" |
| HEIC conversion fails | 500: "Failed to process image" |
| Rate limit exceeded | 429: "Image extraction limit reached (10/day)" |
| Claude API error | 500: "Failed to extract recipe from image" |
| Claude returns unparseable response | 422: "Could not identify a recipe in the uploaded images" |
| No recipe content detected | 422: "No recipe found in the uploaded images. Try a clearer photo or different angle." |

## Out of Scope

- Storing uploaded photos as recipe hero images (they're photos of paper, not food photography)
- Batch import (multiple recipes from one upload)
- Real-time camera viewfinder / crop UI
- Handwriting training or user-specific OCR models
- Async/job-based processing (can add later if needed)

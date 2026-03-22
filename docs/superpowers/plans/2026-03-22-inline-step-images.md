# Inline Step Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Associate images with specific instruction steps during scraping and display them inline beneath each step in the recipe view.

**Architecture:** Add an optional `imageUrl` field to the `Instruction` model. During HTML fallback extraction, infer image-to-step associations by DOM proximity. Images mapped to steps are removed from the top-level `images[]` array. Unassociated images appear after the last instruction step. On display, each instruction renders its associated image beneath the step text, indented to align with the text column.

**Tech Stack:** Prisma (migration), Cheerio (scraper), Next.js API routes, React (RecipePage component)

---

### Task 1: Add `imageUrl` to the Instruction model

**Files:**
- Modify: `prisma/schema.prisma:73-81`

- [ ] **Step 1: Add the imageUrl field to the Instruction model**

Change the `Instruction` model to:

```prisma
model Instruction {
  id       String  @id @default(cuid())
  recipeId String
  text     String
  order    Int
  imageUrl String?
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([recipeId])
}
```

- [ ] **Step 2: Generate and run the migration**

Run:
```bash
pnpm prisma migrate dev --name add-instruction-image-url
```

Expected: Migration succeeds, new column `imageUrl` added to `Instruction` table.

- [ ] **Step 3: Verify Prisma client is regenerated**

Run:
```bash
pnpm prisma generate
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add imageUrl field to Instruction model"
```

---

### Task 2: Update types to support instruction images

**Files:**
- Modify: `src/types/index.ts:9-26` (ExtractedRecipe)
- Modify: `src/types/index.ts:28-46` (CreateRecipeRequest)
- Modify: `src/types/index.ts:64-104` (RecipeDetail)

- [ ] **Step 1: Update ExtractedRecipe type**

Change the `instructions` field in `ExtractedRecipe` from `string[]` to:

```typescript
instructions: Array<{ text: string; imageUrl?: string }>;
```

- [ ] **Step 2: Update CreateRecipeRequest type**

Change the `instructions` field in `CreateRecipeRequest` from `string[]` to:

```typescript
instructions: Array<string | { text: string; imageUrl?: string }>;
```

This keeps backwards compatibility — plain strings still work, but objects with `imageUrl` are also accepted.

- [ ] **Step 3: Update RecipeDetail type**

Add `imageUrl` to the instruction shape in `RecipeDetail`:

```typescript
instructions: {
  id: string;
  text: string;
  order: number;
  imageUrl: string | null;
}[];
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: update types for instruction step images"
```

---

### Task 3: Update scraper to extract image-to-step associations

**Files:**
- Modify: `src/lib/scraper.ts:340-350` (extractRecipeFromPage)
- Modify: `src/lib/scraper.ts:417-508` (extractFromHtml)
- Modify: `src/lib/scraper.ts:354-415` (extractFromJsonLd)
- Modify: `src/lib/scraper.ts:512-550` (parseInstructions)

- [ ] **Step 1: Update `parseInstructions` return type**

Change the return type of `parseInstructions` from `string[]` to `Array<{ text: string; imageUrl?: string }>`:

```typescript
function parseInstructions(
  raw: SchemaRecipe["recipeInstructions"]
): Array<{ text: string; imageUrl?: string }> {
  if (!raw) return [];

  if (typeof raw === "string") {
    return stripHtml(raw)
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  }

  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    return (raw as string[])
      .map((s) => stripHtml(s).trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  }

  if (Array.isArray(raw)) {
    const steps: Array<{ text: string; imageUrl?: string }> = [];
    for (const item of raw as SchemaInstruction[]) {
      if (item["@type"] === "HowToSection" && item.itemListElement) {
        for (const sub of item.itemListElement) {
          const text = sub.text || sub.name || "";
          if (text) steps.push({ text: stripHtml(text).trim() });
        }
      } else {
        const text = item.text || item.name || "";
        if (text) steps.push({ text: stripHtml(text).trim() });
      }
    }
    return steps.filter((s) => s.text);
  }

  return [];
}
```

- [ ] **Step 2: Update `extractFromJsonLd` to use new instruction shape**

The `extractFromJsonLd` function already calls `parseInstructions` and assigns the result to `instructions`. Since JSON-LD has no positional image context, no further changes needed — steps will have no `imageUrl` set. Update the return to pass `instructions` directly (it's already an array of objects now).

- [ ] **Step 3: Add `extractInstructionsWithImages` for HTML fallback**

Add a new function in `scraper.ts` that walks the recipe instruction container in the DOM and associates nearby images with steps:

```typescript
function extractInstructionsWithImages(
  $: cheerio.CheerioAPI,
  pageImages: ImageCandidate[],
  baseUrl: string
): { instructions: Array<{ text: string; imageUrl?: string }>; usedImageUrls: Set<string> } {
  const instructions: Array<{ text: string; imageUrl?: string }> = [];
  const usedImageUrls = new Set<string>();

  // Try each instruction selector to find the container
  const instructionSelectors = [
    ".wprm-recipe-instructions",
    ".tasty-recipe-instructions",
    '[class*="instruction"]',
    '[itemprop="recipeInstructions"]',
    ".recipe-instructions",
    ".directions",
    ".steps",
    ".recipe-method",
  ];

  let container: cheerio.Cheerio<cheerio.Element> | null = null;
  for (const selector of instructionSelectors) {
    const found = $(selector).first();
    if (found.length > 0) {
      container = found;
      break;
    }
  }

  if (!container) {
    return { instructions: [], usedImageUrls };
  }

  // Build a set of valid page image URLs for matching
  const pageImageUrls = new Set(
    pageImages.map((img) => {
      try { return new URL(img.src, baseUrl).href.split("?")[0]; }
      catch { return img.src; }
    })
  );

  // Walk children of the container looking for <li> or block-level step elements
  // and <img> elements interspersed between them
  const stepElements = container.find("li");

  if (stepElements.length === 0) {
    // No list items found — fall back to plain text extraction
    return { instructions: [], usedImageUrls };
  }

  stepElements.each((_, el) => {
    const stepEl = $(el);
    const text = stepEl.text().trim();
    if (!text) return;

    const step: { text: string; imageUrl?: string } = { text };

    // Look for an <img> inside this <li> or immediately after it
    let img = stepEl.find("img").first();

    // If no img inside the li, check the next sibling
    if (img.length === 0) {
      const next = stepEl.next();
      if (next.length > 0) {
        // Check if the next sibling IS an img or contains one (e.g., wrapped in a div)
        if (next.is("img")) {
          img = next;
        } else if (next.find("img").length > 0 && next.find("li").length === 0) {
          // It's a wrapper div with an image, not another list item
          img = next.find("img").first();
        }
      }
    }

    if (img.length > 0) {
      const src =
        img.attr("data-pin-media") ||
        img.attr("data-src") ||
        img.attr("data-lazy-src") ||
        img.attr("data-original") ||
        img.attr("src") ||
        "";

      if (src) {
        try {
          let absoluteSrc = new URL(src, baseUrl).href;
          absoluteSrc = absoluteSrc.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, ".$1");
          const dedupeKey = absoluteSrc.split("?")[0];

          // Only use if it looks like a real food/step image
          const srcLower = absoluteSrc.toLowerCase();
          const isSkippable = IMAGE_SKIP_PATTERNS.some((p) => srcLower.includes(p));

          if (!isSkippable) {
            step.imageUrl = absoluteSrc;
            usedImageUrls.add(dedupeKey);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }

    instructions.push(step);
  });

  return { instructions, usedImageUrls };
}
```

- [ ] **Step 4: Update `extractFromHtml` to use the new function**

Modify the instruction extraction section and image filtering in `extractFromHtml`:

```typescript
function extractFromHtml(
  html: string,
  pageImages: ImageCandidate[],
  baseUrl: string,
  notes: RecipeNotes
): ExtractedRecipe {
  const $ = cheerio.load(html);

  // Title (unchanged)
  const title = $(
    'h1, h2.wprm-recipe-name, .recipe-title, [class*="recipe-name"], [class*="recipe-title"]'
  )
    .first()
    .text()
    .trim() || "Untitled Recipe";

  // Ingredients (unchanged)
  const ingredients: string[] = [];
  const ingredientSelectors = [
    ".wprm-recipe-ingredient",
    ".tasty-recipe-ingredients li",
    '[class*="ingredient"] li',
    '[itemprop="recipeIngredient"]',
    ".recipe-ingredients li",
    ".ingredients li",
    ".ingredient-list li",
  ];
  for (const selector of ingredientSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text) ingredients.push(text);
    });
    if (ingredients.length > 0) break;
  }

  // Instructions — try image-aware extraction first
  const { instructions: instructionsWithImages, usedImageUrls } =
    extractInstructionsWithImages($, pageImages, baseUrl);

  let instructions: Array<{ text: string; imageUrl?: string }>;

  if (instructionsWithImages.length > 0) {
    instructions = instructionsWithImages;
  } else {
    // Fall back to existing plain-text extraction
    const plainInstructions: string[] = [];
    const instructionSelectors = [
      ".wprm-recipe-instruction",
      ".tasty-recipe-instructions li",
      '[class*="instruction"] li',
      '[itemprop="recipeInstructions"] li',
      ".recipe-instructions li",
      ".directions li",
      ".steps li",
      ".recipe-method li",
    ];
    for (const selector of instructionSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text) plainInstructions.push(text);
      });
      if (plainInstructions.length > 0) break;
    }
    instructions = plainInstructions.map((text) => ({ text }));
  }

  // Images — filter out any that were associated with steps
  const images = pageImages
    .filter((img) => {
      const dedupeKey = img.src.split("?")[0];
      return !usedImageUrls.has(dedupeKey);
    })
    .slice(0, 20)
    .map((img) => img.src);

  // Cook time (unchanged)
  let cookTimeMinutes: number | null = null;
  const timeEl = $(
    '[itemprop="totalTime"], [itemprop="cookTime"], .wprm-recipe-total-time-container, [class*="cook-time"], [class*="total-time"]'
  ).first();
  const timeContent =
    timeEl.attr("content") || timeEl.attr("datetime") || timeEl.text();
  if (timeContent) {
    cookTimeMinutes = parseDuration(timeContent);
  }

  return {
    title,
    ingredients,
    instructions,
    images,
    suggestedMealTypes: [],
    suggestedCuisines: [],
    suggestedDietary: [],
    suggestedCookTimeMinutes: cookTimeMinutes,
    servings: null,
    substitutions: [],
    storageTips: notes.storageTips,
    makeAheadNotes: notes.makeAheadNotes,
    servingSuggestions: notes.servingSuggestions,
    techniqueNotes: notes.techniqueNotes,
    nutrition: null,
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/scraper.ts
git commit -m "feat: extract image-to-step associations in HTML fallback scraper"
```

---

### Task 4: Update ImportForm to handle instruction objects

**Files:**
- Modify: `src/components/recipes/ImportForm.tsx:14-38` (toHtmlOl, fromHtml helpers)
- Modify: `src/components/recipes/ImportForm.tsx:206-231` (handleSave)

- [ ] **Step 1: Update `toHtmlOl` to accept instruction objects**

```typescript
function toHtmlOl(items: Array<string | { text: string; imageUrl?: string }>): string {
  if (items.length === 0) return "";
  return "<ol>" + items.map((item) => {
    const text = typeof item === "string" ? item : item.text;
    return `<li>${text}</li>`;
  }).join("") + "</ol>";
}
```

- [ ] **Step 2: Store instruction image mappings alongside the form state**

Add state to track instruction-to-image associations. In the ImportForm component, after the existing state declarations (~line 69):

```typescript
const [instructionImages, setInstructionImages] = useState<Map<number, string>>(new Map());
```

When extraction completes (in the `useEffect` that populates form state from `extracted`), populate the map:

```typescript
// In the useEffect where extracted data is set
if (extracted) {
  // ... existing field population ...
  const imgMap = new Map<number, string>();
  extracted.instructions.forEach((inst, i) => {
    if (typeof inst !== "string" && inst.imageUrl) {
      imgMap.set(i, inst.imageUrl);
    }
  });
  setInstructionImages(imgMap);
}
```

- [ ] **Step 3: Update `handleSave` to include imageUrl in instructions**

> **Known limitation:** Image associations are tracked by index. If the user reorders or deletes steps in the rich text editor during import review, associations may become misaligned. This is acceptable for v1 since most users will not heavily edit step order during import.

In the `handleSave` function, change how instructions are serialized:

```typescript
const instructionTexts = fromHtml(instructions);
const instructionPayload = instructionTexts.map((text, i) => {
  const imageUrl = instructionImages.get(i);
  return imageUrl ? { text, imageUrl } : text;
});
```

Then in the `fetch` body, use `instructions: instructionPayload` instead of `instructions: fromHtml(instructions)`.

- [ ] **Step 4: Commit**

```bash
git add src/components/recipes/ImportForm.tsx
git commit -m "feat: pass instruction image associations through import form"
```

---

### Task 5: Update API routes to handle instruction images

**Files:**
- Modify: `src/app/api/recipes/route.ts:135-139` (POST - instruction creation)
- Modify: `src/app/api/recipes/[id]/route.ts:75-79` (GET - instruction response)
- Modify: `src/app/api/recipes/[id]/route.ts:147-155` (PUT - instruction replacement)

- [ ] **Step 1: Update POST /api/recipes to upload and save step images**

In the POST handler, after uploading the main recipe images, upload any instruction step images and use the uploaded URLs when creating instructions:

```typescript
// Download and upload main recipe images to Supabase Storage
const storedImages = await uploadRecipeImages(
  body.images,
  user.id,
  recipeId
);

// Upload instruction step images in parallel
const stepImageUrls = body.instructions.map((inst) =>
  typeof inst !== "string" && inst.imageUrl ? inst.imageUrl : null
);
const stepImagesToUpload = stepImageUrls.filter(Boolean) as string[];
const uploadedStepImages = stepImagesToUpload.length > 0
  ? await uploadRecipeImages(stepImagesToUpload, user.id, recipeId)
  : [];

// Build a map from original URL to uploaded URL
const stepImageMap = new Map<string, string>();
stepImagesToUpload.forEach((origUrl, i) => {
  if (uploadedStepImages[i]) {
    stepImageMap.set(origUrl, uploadedStepImages[i]);
  }
});
```

Then change the instruction creation block to use uploaded URLs:

```typescript
instructions: {
  create: body.instructions.map((inst, i) => {
    const text = typeof inst === "string" ? inst : inst.text;
    const origImageUrl = typeof inst === "string" ? null : (inst.imageUrl ?? null);
    const imageUrl = origImageUrl ? (stepImageMap.get(origImageUrl) ?? null) : null;
    return {
      text,
      order: i,
      imageUrl,
    };
  }),
},
```

- [ ] **Step 2: Update GET /api/recipes/[id] to return imageUrl**

In the instruction mapping of the GET handler, add `imageUrl`:

```typescript
instructions: recipe.instructions.map((i) => ({
  id: i.id,
  text: i.text,
  order: i.order,
  imageUrl: i.imageUrl,
})),
```

- [ ] **Step 3: Update PUT /api/recipes/[id] to preserve imageUrl on plain-string updates**

The edit form sends instructions as plain strings (no `imageUrl`). To avoid silently deleting step images when a user edits text, the PUT handler should preserve existing `imageUrl` values by matching on step order.

In the instruction replacement section of the PUT handler:

```typescript
if (body.instructions !== undefined) {
  // Read existing instructions to preserve imageUrl when incoming data is plain strings.
  // Match by text content (not order index) to handle reordering/insertion gracefully.
  const existingInstructions = await prisma.instruction.findMany({
    where: { recipeId: id },
    select: { text: true, imageUrl: true },
  });
  const existingImageByText = new Map(
    existingInstructions
      .filter((inst) => inst.imageUrl)
      .map((inst) => [inst.text, inst.imageUrl])
  );

  await prisma.instruction.deleteMany({ where: { recipeId: id } });
  await prisma.instruction.createMany({
    data: (body.instructions as Array<string | { text: string; imageUrl?: string }>).map(
      (inst, i) => {
        const text = typeof inst === "string" ? inst : inst.text;
        // If the instruction is a plain string, preserve existing imageUrl matched by text
        const imageUrl = typeof inst === "string"
          ? (existingImageByText.get(text) ?? null)
          : (inst.imageUrl ?? null);
        return {
          recipeId: id,
          text,
          order: i,
          imageUrl,
        };
      }
    ),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/recipes/route.ts src/app/api/recipes/[id]/route.ts
git commit -m "feat: handle instruction imageUrl in recipe API routes"
```

---

### Task 6: Display inline step images in RecipePage

**Files:**
- Modify: `src/components/recipes/RecipePage.tsx:313-330` (instructions rendering)

- [ ] **Step 1: Add `allImages` memo that combines gallery and step images**

Near the top of the component (after the existing `scaledIngredients` memo), add:

```typescript
const allImages = useMemo(() => {
  const stepImages = recipe.instructions
    .filter((inst) => inst.imageUrl)
    .map((inst) => inst.imageUrl!);
  return [...recipe.images, ...stepImages];
}, [recipe.images, recipe.instructions]);
```

- [ ] **Step 2: Update the instructions rendering to show inline images**

Replace the instructions `<ol>` block:

```tsx
<ol className="space-y-5">
  {recipe.instructions.map((inst, i) => (
    <li key={inst.id} className="flex flex-col">
      <div className="flex gap-4">
        <span className="font-display text-xl font-black text-red/40 select-none shrink-0 w-7 mt-0.5">
          {String(i + 1).padStart(2, "0")}
        </span>
        <p className="font-serif text-base leading-relaxed text-black">
          {inst.text}
        </p>
      </div>
      {inst.imageUrl && (
        <div className="ml-11 mt-3">
          <img
            src={inst.imageUrl}
            alt={`Step ${i + 1}`}
            className="w-full aspect-video object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => {
              const idx = allImages.indexOf(inst.imageUrl!);
              setLightboxIndex(idx >= 0 ? idx : 0);
            }}
          />
        </div>
      )}
    </li>
  ))}
</ol>
```

- [ ] **Step 3: Update lightbox and all image click handlers to use `allImages`**

Update the `ImageLightbox` to use `allImages`:

```tsx
{lightboxIndex !== null && (
  <ImageLightbox
    images={allImages}
    initialIndex={lightboxIndex}
    alt={recipe.title}
    onClose={() => setLightboxIndex(null)}
  />
)}
```

The hero image click (`onClick={() => setLightboxIndex(0)}`) stays the same — index 0 is still the first image in `allImages` since `recipe.images` comes first.

The additional images grid clicks also stay the same — they use `setLightboxIndex(i + 1)` where `i` is the index into `additionalImages` (which is `recipe.images.slice(1)`), so `i + 1` correctly maps to the `allImages` index since `recipe.images` is the prefix of `allImages`.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes/RecipePage.tsx
git commit -m "feat: display inline step images in recipe instructions"
```

---

### Task 7: Verify end-to-end flow

- [ ] **Step 1: Run the dev server and test import**

Run:
```bash
pnpm dev
```

Test by importing a recipe from a blog that uses interleaved step photos (e.g., a Serious Eats or Sally's Baking Addiction recipe). Verify:
1. Extraction identifies images associated with steps
2. Associated images are removed from the top-level gallery
3. Recipe saves successfully with `imageUrl` on instructions
4. RecipePage displays images inline beneath their associated steps
5. Clicking an inline image opens the lightbox
6. Unassociated images still appear in the bottom gallery

- [ ] **Step 2: Test with a JSON-LD-only recipe**

Import a recipe that only has JSON-LD data (no inline step photos in the HTML). Verify:
1. Instructions have no `imageUrl` set
2. All images appear in the hero + gallery as before
3. No visual regression

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found in end-to-end testing"
```

# Recipe App — Server-Side Scraper Integration

> Replace AI-powered recipe extraction with deterministic server-side scraping using JSON-LD structured data and HTML fallback parsing.

-----

## Summary

This task replaces the Anthropic API–based recipe extraction pipeline with a pure server-side approach. The vast majority of food blogs embed `schema.org/Recipe` JSON-LD structured data for SEO, which already contains title, ingredients, instructions, cook time, cuisine, images, and dietary info in machine-readable form. We parse that directly with Cheerio — no AI calls, no API key required.

**What changes:**

|File                          |Action            |Notes                                 |
|------------------------------|------------------|--------------------------------------|
|`src/lib/scraper.ts`          |**ADD** (new file)|Core extraction library               |
|`src/app/api/extract/route.ts`|**REPLACE**       |Swap AI imports for scraper imports   |
|`src/lib/ai.ts`               |**DELETE**        |No longer imported anywhere           |
|`package.json`                |**EDIT**          |Remove `@anthropic-ai/sdk` dependency |
|`.env` / `.env.local`         |**EDIT**          |`ANTHROPIC_API_KEY` no longer required|
|`CLAUDE.md`                   |**EDIT**          |Update extraction pipeline docs       |

**What does NOT change:**

- `ExtractedRecipe` type (`src/types/index.ts`) — same shape, same contract
- `ImportForm` component — calls `/api/extract` and reads `ExtractedRecipe`, no changes
- `POST /api/recipes` route — receives the same `CreateRecipeRequest` payload
- Prisma schema, Supabase auth, image storage — all untouched
- Rate limiting logic — preserved in the extract route

-----

## File 1: `src/lib/scraper.ts` (new)

Create this file with the following responsibilities:

### `scrapePage(url: string): Promise<ScrapedPage>`

Fetches the target URL and returns:

- `html` — cleaned body HTML (scripts, styles, nav, footer, ads stripped via Cheerio)
- `jsonLd` — the first `schema.org/Recipe` object found in any `<script type="application/ld+json">` tag, or `null`
- `images` — all `<img>` candidates from the page with absolute URLs, filtered to exclude logos, icons, tracking pixels, and images smaller than 100×100
- `url` — the original URL (for resolving relative paths)

**JSON-LD parsing details:**

- Parse every `<script type="application/ld+json">` block
- Handle three common patterns: direct `{"@type": "Recipe"}` objects, arrays of objects, and `@graph` arrays (used by Yoast SEO, WP Recipe Maker, etc.)
- `@type` can be a string or array — check both
- Stop at the first Recipe found

### `extractRecipeFromPage(page: ScrapedPage): ExtractedRecipe`

Routes to one of two extractors based on whether JSON-LD was found:

**Primary path — `extractFromJsonLd()`:**

|JSON-LD field                        |Maps to                   |Notes                                                                                                                                                                                                                            |
|-------------------------------------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`name`                               |`title`                   |Strip HTML entities                                                                                                                                                                                                              |
|`recipeIngredient`                   |`ingredients`             |Array of strings, strip any HTML tags                                                                                                                                                                                            |
|`recipeInstructions`                 |`instructions`            |Can be a string (split on newlines), array of strings, or array of `HowToStep`/`HowToSection` objects — handle all three. For `HowToSection`, flatten `itemListElement` into steps. Use `.text` or `.name` from each step object.|
|`image`                              |`images`                  |Can be a string, array of strings, or array of `{url}` objects. Supplement from page images until 2–8 total.                                                                                                                     |
|`totalTime` / `cookTime` / `prepTime`|`suggestedCookTimeMinutes`|ISO 8601 duration (e.g. `PT1H30M` → 90). Prefer `totalTime`, fall back to `cookTime`, then `prepTime`. Also handle plain text ("45 minutes", "1 hour 30 minutes").                                                               |
|`recipeCategory`                     |`suggestedMealTypes`      |Fuzzy match against: Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer                                                                                                                                                         |
|`recipeCuisine`                      |`suggestedCuisines`       |Fuzzy match against the app's cuisine list                                                                                                                                                                                       |
|`suitableForDiet` + `keywords`       |`suggestedDietary`        |Map Schema.org diet URIs (e.g. `https://schema.org/VeganDiet`) and keyword strings to: Vegan, Vegetarian, Gluten-Free, Dairy-Free, Keto, Paleo, Nut-Free, Low-Carb                                                               |

**Fallback path — `extractFromHtml()`:**

When no JSON-LD is found, use Cheerio to look for common recipe card selectors:

- **Title:** `h1`, `.wprm-recipe-name`, `.recipe-title`, `[class*="recipe-name"]`
- **Ingredients:** `.wprm-recipe-ingredient`, `.tasty-recipe-ingredients li`, `[class*="ingredient"] li`, `[itemprop="recipeIngredient"]`
- **Instructions:** `.wprm-recipe-instruction`, `.tasty-recipe-instructions li`, `[class*="instruction"] li`, `[itemprop="recipeInstructions"] li`
- **Cook time:** `[itemprop="totalTime"]`, `[itemprop="cookTime"]`, `.wprm-recipe-total-time-container`

For each selector group, try selectors in order and stop at the first one that yields results. Tag suggestions are left empty in the fallback path (user fills them manually).

### Image filtering rules

Skip images where `src` or `alt` contains any of: logo, icon, avatar, author, profile, gravatar, pinterest, facebook, twitter, instagram, badge, widget, banner-ad, advertisement, sponsor, pixel, tracking, emoji, smiley, arrow, button, placeholder, `data:image/svg`, or the 1×1 tracking pixel base64 prefix. Also skip images with explicit `width` or `height` attributes under 100px.

-----

## File 2: `src/app/api/extract/route.ts` (replace)

Replace the entire file. The new version:

1. Imports `scrapePage` and `extractRecipeFromPage` from `@/lib/scraper` (NOT `@/lib/ai`)
2. Keeps the existing Supabase auth check and rate limiting logic unchanged
3. Calls `scrapePage(url)` then `extractRecipeFromPage(page)`
4. Adds a quality gate: if title is "Untitled Recipe" AND both ingredients and instructions are empty, return a `422` with a helpful error message suggesting the page may not contain structured recipe data
5. Returns the `ExtractedRecipe` JSON with two extra fields:
   - `sourceUrl` — the original URL
   - `_meta.method` — either "json-ld" or "html-fallback" (useful for debugging)
6. Retains the one-retry logic from the original

-----

## File 3: Cleanup

### Delete `src/lib/ai.ts`

This file is no longer imported by anything. Remove it.

### Edit `package.json`

Remove `@anthropic-ai/sdk` from `dependencies`:

```diff
  "dependencies": {
-   "@anthropic-ai/sdk": "^0.79.0",
    "@paralleldrive/cuid2": "^3.3.0",
```

Then run:

```bash
npm install
```

(or `pnpm install` if using pnpm)

### Edit `.env` / `.env.local`

The `ANTHROPIC_API_KEY` variable is no longer required. It can be removed or left as a no-op — nothing reads it anymore. Keep the comment in case AI is re-added later:

```env
# AI (deferred — not used in current extraction pipeline)
# ANTHROPIC_API_KEY=
```

### Edit `CLAUDE.md`

In Section 4 ("AI Recipe Extraction Pipeline"), update the heading and flow description:

**Old heading:** `## 4. AI Recipe Extraction Pipeline`
**New heading:** `## 4. Recipe Extraction Pipeline`

**Updated flow (replace steps 3–7):**

```
3. Server fetches the page with fetch()
4. Cheerio parses HTML:
   a. Extracts all <script type="application/ld+json"> blocks
   b. Searches for a schema.org/Recipe object (handles direct, array, and @graph patterns)
   c. If found: maps JSON-LD fields to ExtractedRecipe (title, ingredients, instructions, images, tags, cook time)
   d. If not found: falls back to HTML pattern matching using common recipe card selectors (WPRM, Tasty Recipes, itemprop microdata)
   e. Collects page images, filtering out logos/icons/tracking pixels
5. Structured result returned to client for review
```

In Section 1 ("Tech Stack"), update the AI row:

**Old:** `| AI | Anthropic API (Claude) |`
**New:** `| Extraction | Cheerio (JSON-LD + HTML parsing) |`

In Section 8 ("Environment Variables"), remove or comment out `ANTHROPIC_API_KEY`.

-----

## Testing

After applying all changes, verify with these scenarios:

1. **JSON-LD path (most food blogs):** Paste a URL from a major recipe site (e.g. seriouseats.com, budgetbytes.com, pinchofyum.com, bonappetit.com). These all use JSON-LD. Expect: title, full ingredient list, step-by-step instructions, images, and pre-selected tags.
2. **HTML fallback path:** Find a recipe page without JSON-LD (rare, but some older or custom-built sites). Expect: partial extraction with whatever the HTML selectors can find.
3. **Non-recipe page:** Paste a URL to a news article or homepage. Expect: a `422` error with "Could not extract a recipe from this page."
4. **Invalid/unreachable URL:** Expect: a `500` error with a clear message.
5. **Rate limiting:** Make 21 extraction attempts. The 21st should return a `429`.

-----

## Architecture notes

- **Why JSON-LD first:** Google requires `schema.org/Recipe` structured data for recipe rich results. As a result, virtually every food blog published since ~2018 embeds it. This is the blog author's own canonical representation of their recipe.
- **Why keep the HTML fallback:** A small number of older blogs or custom-built sites may not have JSON-LD. The HTML fallback catches common WordPress recipe plugin patterns.
- **Why no AI this round:** Server-side parsing is deterministic, fast (~200ms vs ~3–5s for an AI call), free (no API costs), and produces consistent results. AI extraction can be re-added later as an optional enhancement for pages that fail both JSON-LD and HTML parsing.
- **The `_meta.method` field** is returned in the API response so the frontend can eventually surface extraction confidence or offer manual entry prompts when using the less reliable HTML fallback path.

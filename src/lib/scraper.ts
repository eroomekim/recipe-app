import * as cheerio from "cheerio";
import type { ExtractedRecipe } from "@/types";
import { extractRecipeNotes } from "./scraper-notes";
import type { RecipeNotes } from "./scraper-notes";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScrapedPage {
  html: string;
  rawHtml: string;  // full HTML before stripping
  jsonLd: SchemaRecipe | null;
  images: ImageCandidate[];
  url: string;
}

interface ImageCandidate {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface SchemaRecipe {
  name?: string;
  image?: string | string[] | { url: string }[];
  recipeIngredient?: string[];
  recipeInstructions?: SchemaInstruction[] | string[] | string;
  cookTime?: string;
  prepTime?: string;
  totalTime?: string;
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
  keywords?: string | string[];
  suitableForDiet?: string | string[];
  recipeYield?: string | string[];
  nutrition?: {
    calories?: string;
    fatContent?: string;
    proteinContent?: string;
    carbohydrateContent?: string;
    fiberContent?: string;
    sugarContent?: string;
    sodiumContent?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface SchemaInstruction {
  "@type"?: string;
  text?: string;
  name?: string;
  itemListElement?: SchemaInstruction[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MEAL_TYPES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Dessert",
  "Appetizer",
  "Sandwich",
  "Salad",
  "Sauce",
  "Dressing",
];

const CUISINES = [
  "Italian",
  "Mexican",
  "Thai",
  "Japanese",
  "Indian",
  "French",
  "American",
  "Mediterranean",
  "Chinese",
  "Korean",
  "Vietnamese",
  "Middle Eastern",
  "Greek",
  "Other",
];

const DIETARY_MAP: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  "gluten-free": "Gluten-Free",
  glutenfree: "Gluten-Free",
  "dairy-free": "Dairy-Free",
  dairyfree: "Dairy-Free",
  keto: "Keto",
  ketogenic: "Keto",
  paleo: "Paleo",
  "nut-free": "Nut-Free",
  nutfree: "Nut-Free",
  "low-carb": "Low-Carb",
  lowcarb: "Low-Carb",
  // Schema.org RestrictedDiet values
  "https://schema.org/glutenfreediet": "Gluten-Free",
  "https://schema.org/vegandiet": "Vegan",
  "https://schema.org/vegetariandiet": "Vegetarian",
  "https://schema.org/dairyfreediet": "Dairy-Free",
  "https://schema.org/lowcalorieddiet": "Low-Carb",
  "https://schema.org/diabeticdiet": "Low-Carb",
};

const IMAGE_SKIP_PATTERNS = [
  "logo",
  "icon",
  "avatar",
  "author",
  "profile",
  "gravatar",
  "pinterest",
  "facebook",
  "twitter",
  "instagram",
  "badge",
  "widget",
  "banner-ad",
  "advertisement",
  "sponsor",
  "pixel",
  "tracking",
  "emoji",
  "smiley",
  "arrow",
  "button",
  "placeholder",
  "data:image/svg",
  "data:image/gif;base64,R0lGODlhAQAB", // 1x1 tracking pixel
];

// ─── Browser Fallback ─────────────────────────────────────────────────────────

async function fetchWithBrowser(url: string): Promise<string> {
  try {
    const { getBrowser } = await import("./extraction/browser");
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      // Wait for bot protection challenges to resolve and content to render
      await page.waitForFunction(
        () => document.querySelector('script[type="application/ld+json"]') !== null
          || document.querySelectorAll('[class*="ingredient"], [class*="instruction"], [itemprop]').length > 0
          || document.body.innerText.length > 2000,
        { timeout: 15_000 }
      ).catch(() => {
        // Timeout waiting for content — proceed with whatever we have
      });
      return await page.content();
    } finally {
      await page.close();
    }
  } catch {
    throw new Error("This site blocks automated access. Try using the Upload Image tab with a screenshot instead.");
  }
}

// ─── Page Fetcher ────────────────────────────────────────────────────────────

export async function scrapePage(url: string): Promise<ScrapedPage> {
  let html: string;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RecipeBook/1.0; +https://recipebook.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 403 || response.status === 402) {
      // Site blocks server-side requests — fall back to headless browser
      html = await fetchWithBrowser(url);
      if (html.length < 1000 || html.includes("support@people.inc")) {
        throw new Error("This site blocks automated access. Try using the Upload Image tab with a screenshot instead.");
      }
    } else if (!response.ok) {
      throw new Error(`Failed to fetch page: HTTP ${response.status}`);
    } else {
      html = await response.text();
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes("Failed to fetch page") || err.message.includes("blocks automated"))) {
      throw err;
    }
    // Network errors or timeouts — try browser as fallback
    html = await fetchWithBrowser(url);
  }
  const $ = cheerio.load(html);

  // ── Extract JSON-LD recipe data ──
  const jsonLd = extractJsonLdRecipe($);

  // ── Collect image candidates ──
  const images = collectImages($, url);

  const rawHtml = html;  // preserve before stripping

  // ── Return cleaned body for fallback parsing ──
  $(
    "script, style, nav, footer, header, iframe, noscript, svg, [role='navigation'], [role='banner']"
  ).remove();
  // Remove non-content elements — but avoid overly broad attribute selectors
  // that can match unrelated Squarespace/CMS classes (e.g., "ad-" inside "alternating-side-by-side-ad...")
  $('[class*="sidebar"], [class*="related-posts"]').remove();
  $(".ad-container, .ad-wrapper, .ad-slot, .ad-unit, .advertisement").remove();
  $('[id*="sidebar"]').remove();
  // Only remove comments/social/share sections that are clearly non-content
  $("section[class*='comment'], .comments-section, .comment-list").remove();
  $("div[class*='social-share'], div[class*='share-buttons']").remove();

  const bodyHtml = $("body").html() || "";

  return { html: bodyHtml, rawHtml, jsonLd, images, url };
}

// ─── JSON-LD Extraction ──────────────────────────────────────────────────────

function extractJsonLdRecipe(
  $: cheerio.CheerioAPI
): SchemaRecipe | null {
  const scripts = $('script[type="application/ld+json"]');
  let recipe: SchemaRecipe | null = null;

  scripts.each((_, el) => {
    if (recipe) return; // already found one

    try {
      const raw = $(el).html();
      if (!raw) return;

      const data = JSON.parse(raw);
      recipe = findRecipeInJsonLd(data);
    } catch {
      // malformed JSON-LD, skip
    }
  });

  return recipe;
}

function findRecipeInJsonLd(data: unknown): SchemaRecipe | null {
  if (!data || typeof data !== "object") return null;

  // Direct Recipe object
  if (isRecipeType(data)) return data as SchemaRecipe;

  // Array of objects (common pattern)
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  // @graph pattern (used by Yoast SEO and others)
  const obj = data as Record<string, unknown>;
  if ("@graph" in obj && Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
  }

  return null;
}

function isRecipeType(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  const type = obj["@type"];
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.includes("Recipe");
  return false;
}

// ─── Image Collection ────────────────────────────────────────────────────────

/**
 * Parse a srcset attribute and return the URL of the largest image.
 * srcset format: "url1 300w, url2 600w, url3 1200w"
 */
function getLargestFromSrcset(srcset: string, baseUrl: string): string | null {
  const entries = srcset.split(",").map((s) => s.trim()).filter(Boolean);
  let bestUrl = "";
  let bestWidth = 0;

  for (const entry of entries) {
    const parts = entry.split(/\s+/);
    if (parts.length < 2) continue;
    const url = parts[0];
    const descriptor = parts[1];
    const width = parseInt(descriptor, 10);
    if (width > bestWidth) {
      bestWidth = width;
      try {
        bestUrl = new URL(url, baseUrl).href;
      } catch {
        continue;
      }
    }
  }

  return bestUrl || null;
}

function collectImages(
  $: cheerio.CheerioAPI,
  baseUrl: string
): ImageCandidate[] {
  const seen = new Set<string>();
  const images: ImageCandidate[] = [];

  $("img").each((_, el) => {
    // Prefer the largest available source in this order:
    // 1. srcset (largest descriptor)
    // 2. data-pin-media (Pinterest full-size, used by food blogs)
    // 3. data-src / data-lazy-src / data-original (lazy-loaded full-size)
    // 4. src (often a smaller/responsive version)
    const srcset = $(el).attr("srcset") || "";
    const largestFromSrcset = srcset ? getLargestFromSrcset(srcset, baseUrl) : null;

    const src =
      largestFromSrcset ||
      $(el).attr("data-pin-media") ||
      $(el).attr("data-src") ||
      $(el).attr("data-lazy-src") ||
      $(el).attr("data-original") ||
      $(el).attr("src") ||
      "";

    if (!src) return;

    // Skip known non-food images
    const srcLower = src.toLowerCase();
    const altLower = ($(el).attr("alt") || "").toLowerCase();
    if (
      IMAGE_SKIP_PATTERNS.some(
        (pattern) => srcLower.includes(pattern) || altLower.includes(pattern)
      )
    ) {
      return;
    }

    // Resolve to absolute URL
    let absoluteSrc: string;
    try {
      absoluteSrc = new URL(src, baseUrl).href;
    } catch {
      return;
    }

    // Strip common resize suffixes to get the full-size URL
    // e.g., "-300x200.jpg" → ".jpg", "?w=300&h=200" → remove params
    absoluteSrc = absoluteSrc.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, ".$1");

    // Deduplicate
    const dedupeKey = absoluteSrc.split("?")[0]; // ignore query params for dedup
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const width = parseInt($(el).attr("width") || "0", 10);
    const height = parseInt($(el).attr("height") || "0", 10);

    // Skip tiny images (likely icons/tracking pixels)
    if ((width > 0 && width < 100) || (height > 0 && height < 100)) return;

    images.push({
      src: absoluteSrc,
      alt: $(el).attr("alt") || "",
      width: width || undefined,
      height: height || undefined,
    });
  });

  return images;
}

// ─── Recipe Extractor (main entry point) ─────────────────────────────────────

export function extractRecipeFromPage(page: ScrapedPage): ExtractedRecipe {
  const $notes = cheerio.load(page.rawHtml);
  const notes = extractRecipeNotes($notes);

  // Supplement with JSON-LD notes field if available and HTML extraction missed it
  if (page.jsonLd) {
    mergeJsonLdNotes(page.jsonLd, notes);
  }

  if (page.jsonLd) {
    const jsonLdResult = extractFromJsonLd(page.jsonLd, page.images, page.url, notes);

    // If JSON-LD had meaningful content, use it
    if (jsonLdResult.ingredients.length > 0 || jsonLdResult.instructions.length > 0) {
      return jsonLdResult;
    }

    // JSON-LD was hollow (empty ingredients + no instructions) — fall through to
    // HTML extraction but keep useful metadata from JSON-LD (title, images, tags)
    const htmlResult = extractFromHtml(page.html, page.images, page.url, notes);
    return {
      ...htmlResult,
      title: jsonLdResult.title !== "Untitled Recipe" ? jsonLdResult.title : htmlResult.title,
      images: jsonLdResult.images.length > 0 ? jsonLdResult.images : htmlResult.images,
      suggestedMealTypes: jsonLdResult.suggestedMealTypes.length > 0 ? jsonLdResult.suggestedMealTypes : htmlResult.suggestedMealTypes,
      suggestedCuisines: jsonLdResult.suggestedCuisines.length > 0 ? jsonLdResult.suggestedCuisines : htmlResult.suggestedCuisines,
      suggestedDietary: jsonLdResult.suggestedDietary.length > 0 ? jsonLdResult.suggestedDietary : htmlResult.suggestedDietary,
      suggestedCookTimeMinutes: jsonLdResult.suggestedCookTimeMinutes ?? htmlResult.suggestedCookTimeMinutes,
      servings: jsonLdResult.servings ?? htmlResult.servings,
      nutrition: jsonLdResult.nutrition ?? htmlResult.nutrition,
    };
  }

  // Fallback: parse from HTML structure
  return extractFromHtml(page.html, page.images, page.url, notes);
}

/**
 * Extract notes from JSON-LD `notes` field (schema.org Recipe supports this).
 * Many recipe plugins (WPRM, Tasty, etc.) populate this field.
 * Only fills in fields that weren't already found by HTML extraction.
 */
function mergeJsonLdNotes(recipe: SchemaRecipe, notes: RecipeNotes): void {
  const rawNotes = recipe.notes || recipe.recipeNotes;
  if (!rawNotes) return;

  const noteText = typeof rawNotes === "string"
    ? rawNotes
    : Array.isArray(rawNotes)
      ? rawNotes.map((n: unknown) => typeof n === "string" ? n : (n as { text?: string })?.text || "").join("\n")
      : "";

  if (!noteText.trim()) return;

  // Try to categorize the JSON-LD notes content
  const stripped = noteText.replace(/<[^>]*>/g, "").trim();
  const lines = stripped.split(/\n+/).filter(Boolean);

  for (const line of lines) {
    for (const { field, keywords } of [
      { field: "storageTips" as const, keywords: /stor(age|e|ing)|refrigerat|freez|keep|leftover|shelf.?life|fridge/i },
      { field: "makeAheadNotes" as const, keywords: /make.?ahead|prep.?ahead|advance|prepare.?earlier|night.?before|meal.?prep/i },
      { field: "servingSuggestions" as const, keywords: /serv(e|ing).?(suggest|with|idea|tip)|pair.?with|goes.?well|accompan|side.?dish/i },
      { field: "techniqueNotes" as const, keywords: /tip|trick|technique|chef|note|secret|why.?this.?works|pro.?tip/i },
    ]) {
      if (keywords.test(line) && !notes[field]) {
        const cleaned = line.replace(/^[^:]+:\s*/i, "").trim();
        notes[field] = cleaned.slice(0, 1000);
        break;
      }
    }
  }

  // If nothing was categorized and techniqueNotes is still empty,
  // put the whole notes content into techniqueNotes as a catch-all
  const hasAny = notes.storageTips || notes.makeAheadNotes || notes.servingSuggestions || notes.techniqueNotes;
  if (!hasAny && stripped.length > 10) {
    notes.techniqueNotes = stripped.slice(0, 1000);
  }
}

// ─── JSON-LD → ExtractedRecipe ───────────────────────────────────────────────

function extractFromJsonLd(
  recipe: SchemaRecipe,
  pageImages: ImageCandidate[],
  baseUrl: string,
  notes: RecipeNotes
): ExtractedRecipe {
  const title = (recipe.name || "Untitled Recipe").trim();

  // ── Ingredients ──
  const ingredients = (recipe.recipeIngredient || [])
    .map((i) => (typeof i === "string" ? stripHtml(i).trim() : ""))
    .filter(Boolean);

  // ── Instructions ──
  const instructions = parseInstructions(recipe.recipeInstructions);

  // ── Images ──
  const images = resolveImages(recipe.image, pageImages, baseUrl);

  // ── Cook time ──
  const cookTimeMinutes = parseDuration(
    recipe.totalTime || recipe.cookTime || recipe.prepTime
  );

  // ── Tags ──
  const suggestedMealTypes = matchTags(
    normalizeStringOrArray(recipe.recipeCategory),
    MEAL_TYPES
  );

  const suggestedCuisines = matchTags(
    normalizeStringOrArray(recipe.recipeCuisine),
    CUISINES
  );

  const dietarySources = [
    ...normalizeStringOrArray(recipe.suitableForDiet),
    ...normalizeStringOrArray(recipe.keywords),
  ];
  const suggestedDietary = matchDietary(dietarySources);

  const servings = parseServings(recipe.recipeYield);
  const nutrition = parseNutrition(recipe.nutrition);

  return {
    title,
    ingredients,
    instructions,
    images,
    suggestedMealTypes,
    suggestedCuisines,
    suggestedDietary,
    suggestedCookTimeMinutes: cookTimeMinutes,
    servings,
    substitutions: [],
    storageTips: notes.storageTips,
    makeAheadNotes: notes.makeAheadNotes,
    servingSuggestions: notes.servingSuggestions,
    techniqueNotes: notes.techniqueNotes,
    nutrition,
  };
}

// ─── HTML Fallback Extraction ────────────────────────────────────────────────

function extractInstructionsWithImages(
  $: cheerio.CheerioAPI,
  pageImages: ImageCandidate[],
  baseUrl: string
): { instructions: Array<{ text: string; imageUrl?: string }>; usedImageUrls: Set<string> } {
  const instructions: Array<{ text: string; imageUrl?: string }> = [];
  const usedImageUrls = new Set<string>();

  const instructionSelectors = [
    ".wprm-recipe-instructions",
    ".tasty-recipe-instructions",
    '[class*="instruction"]:not([class*="ingredient"]):not([class*="and-"])',
    '[itemprop="recipeInstructions"]',
    ".recipe-instructions",
    '.directions:not([class*="ingredient"])',
    ".steps",
    ".recipe-method",
  ];

  let container: ReturnType<cheerio.CheerioAPI> | null = null;
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

  const stepElements = container.find("li");

  if (stepElements.length === 0) {
    return { instructions: [], usedImageUrls };
  }

  stepElements.each((_, el) => {
    const stepEl = $(el);
    const text = stepEl.text().trim();
    if (!text) return;

    const step: { text: string; imageUrl?: string } = { text };

    // Look for an <img> inside this <li> or immediately after it
    let img = stepEl.find("img").first();

    if (img.length === 0) {
      const next = stepEl.next();
      if (next.length > 0) {
        if (next.is("img")) {
          img = next;
        } else if (next.find("img").length > 0 && next.find("li").length === 0) {
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

function extractFromHtml(
  html: string,
  pageImages: ImageCandidate[],
  baseUrl: string,
  notes: RecipeNotes
): ExtractedRecipe {
  const $ = cheerio.load(html);

  const title = $(
    'h1, h2.wprm-recipe-name, .recipe-title, [class*="recipe-name"], [class*="recipe-title"]'
  )
    .first()
    .text()
    .trim() || "Untitled Recipe";

  const ingredients: string[] = [];
  const ingredientSelectors = [
    ".wprm-recipe-ingredient",
    ".tasty-recipe-ingredients li",
    '[class*="ingredient"]:not([class*="direction"]):not([class*="instruction"]):not([class*="and-"]) li',
    '[itemprop="recipeIngredient"]',
    ".recipe-ingredients li",
    '.ingredients:not([class*="direction"]) li',
    ".ingredient-list li",
  ];
  for (const selector of ingredientSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text) ingredients.push(text);
    });
    if (ingredients.length > 0) break;
  }

  // Generic heuristic: find <ul> following a heading that contains "ingredient"
  if (ingredients.length === 0) {
    $("h1, h2, h3, h4, h5").each((_, el) => {
      if (ingredients.length > 0) return;
      const headingText = $(el).text().trim().toLowerCase();
      if (!/ingredient/i.test(headingText)) return;
      // Walk siblings to find the next <ul>
      let sibling = $(el).next();
      while (sibling.length && !sibling.is("h1, h2, h3, h4, h5")) {
        if (sibling.is("ul")) {
          sibling.find("li").each((_, li) => {
            const text = $(li).text().trim();
            if (text) ingredients.push(text);
          });
          if (ingredients.length > 0) return;
        }
        sibling = sibling.next();
      }
    });
  }

  // Text-based heuristic: find "Ingredients:" in paragraph text followed by
  // lines separated by <br> (common on Squarespace and simple blogs)
  if (ingredients.length === 0) {
    $("p, div.sqs-html-content").each((_, el) => {
      if (ingredients.length > 0) return;
      const innerHtml = $(el).html() || "";
      const ingredientMatch = innerHtml.match(
        /<strong>\s*Ingredients\s*:?\s*<\/strong>\s*<\/p>\s*<p[^>]*>\s*([\s\S]*?)(?=<\/p>\s*<p[^>]*>\s*(?:\d+\.|<strong>))/i
      ) || innerHtml.match(
        /(?:Ingredients\s*:)\s*<\/p>\s*<p[^>]*>\s*([\s\S]*?)(?=<\/p>\s*<p[^>]*>\s*\d+\.)/i
      );
      if (ingredientMatch) {
        const block = ingredientMatch[1];
        const lines = block.split(/<br\s*\/?>/i).map((l: string) =>
          l.replace(/<[^>]*>/g, "").trim()
        ).filter((l: string) => l && l !== "-");
        ingredients.push(...lines);
      }
    });
  }

  // Broader text-based heuristic: scan all paragraph text for "Ingredients:" marker
  if (ingredients.length === 0) {
    const contentEl = $(".blog-item-content, .entry-content, .post-content, article").first();
    if (contentEl.length) {
      const contentHtml = contentEl.html() || "";
      // Split by <p> tags, find the one with "Ingredients:"
      const paragraphs = contentHtml.split(/<\/?p[^>]*>/i).filter((s: string) => s.trim());
      let inIngredients = false;
      for (const p of paragraphs) {
        const text = p.replace(/<[^>]*>/g, "").trim();
        if (/^ingredients\s*:/i.test(text)) {
          inIngredients = true;
          // Check if ingredients are on the same line after the label
          const afterLabel = text.replace(/^ingredients\s*:\s*/i, "").trim();
          if (afterLabel) {
            const lines = afterLabel.split(/\n/).filter((l: string) => l.trim() && l.trim() !== "-");
            ingredients.push(...lines);
          }
          continue;
        }
        if (inIngredients) {
          // Stop at numbered steps
          if (/^\d+\.\s/.test(text)) break;
          const lines = p.split(/<br\s*\/?>/i).map((l: string) =>
            l.replace(/<[^>]*>/g, "").trim()
          ).filter((l: string) => l && l !== "-");
          if (lines.length > 0) ingredients.push(...lines);
        }
      }
    }
  }

  // Instructions — try image-aware extraction first
  const { instructions: instructionsWithImages, usedImageUrls } =
    extractInstructionsWithImages($, pageImages, baseUrl);

  let instructions: Array<{ text: string; imageUrl?: string }>;

  if (instructionsWithImages.length > 0) {
    instructions = instructionsWithImages;
  } else {
    const plainInstructions: string[] = [];
    const instructionSelectors = [
      ".wprm-recipe-instruction",
      ".tasty-recipe-instructions li",
      '[class*="instruction"]:not([class*="ingredient"]):not([class*="and-"]) li',
      '[itemprop="recipeInstructions"] li',
      ".recipe-instructions li",
      '.directions:not([class*="ingredient"]) li',
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
    // Generic heuristic: find <ol> or <ul> following a heading about instructions/directions
    if (plainInstructions.length === 0) {
      $("h1, h2, h3, h4, h5").each((_, el) => {
        if (plainInstructions.length > 0) return;
        const headingText = $(el).text().trim().toLowerCase();
        if (!/instruction|direction|method|step|preparation/i.test(headingText)) return;
        let sibling = $(el).next();
        while (sibling.length && !sibling.is("h1, h2, h3, h4, h5")) {
          if (sibling.is("ol, ul")) {
            sibling.find("li").each((_, li) => {
              const text = $(li).text().trim();
              if (text) plainInstructions.push(text);
            });
            if (plainInstructions.length > 0) return;
          }
          sibling = sibling.next();
        }
      });
    }

    // Text-based heuristic: numbered steps in paragraph text (e.g., "1. Do this<br>2. Do that")
    if (plainInstructions.length === 0) {
      const contentEl = $(".blog-item-content, .entry-content, .post-content, article").first();
      if (contentEl.length) {
        const contentHtml = contentEl.html() || "";
        // Find numbered steps (1. ... 2. ... 3. ...)
        const stepMatches = contentHtml.match(/(?:<br\s*\/?>|\n|<\/p>\s*<p[^>]*>)\s*(\d+\.\s[\s\S]*?)(?=(?:<br\s*\/?>|\n|<\/p>)\s*\d+\.\s|<\/p>\s*<\/div>|$)/gi);
        if (stepMatches) {
          for (const match of stepMatches) {
            const text = match.replace(/<[^>]*>/g, "").trim();
            if (text) {
              // Remove the leading number prefix (e.g., "1. ")
              const cleaned = text.replace(/^\d+\.\s*/, "").trim();
              if (cleaned) plainInstructions.push(cleaned);
            }
          }
        }
        // Alternative: scan for all text matching "N. instruction text"
        if (plainInstructions.length === 0) {
          const allText = contentEl.text();
          const numberedSteps = allText.match(/\d+\.\s+[^]+?(?=\d+\.\s|$)/g);
          if (numberedSteps) {
            for (const step of numberedSteps) {
              const cleaned = step.replace(/^\d+\.\s*/, "").trim();
              if (cleaned && cleaned.length > 10) plainInstructions.push(cleaned);
            }
          }
        }
      }
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function resolveImages(
  schemaImage: SchemaRecipe["image"],
  pageImages: ImageCandidate[],
  baseUrl: string
): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  const addImage = (src: string) => {
    let absolute: string;
    try {
      absolute = new URL(src, baseUrl).href;
    } catch {
      return;
    }

    // Strip common resize suffixes to get full-size URL
    absolute = absolute.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)/i, ".$1");

    const dedupeKey = absolute.split("?")[0];
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    images.push(absolute);
  };

  // From JSON-LD schema image field
  if (schemaImage) {
    if (typeof schemaImage === "string") {
      addImage(schemaImage);
    } else if (Array.isArray(schemaImage)) {
      for (const img of schemaImage) {
        if (typeof img === "string") {
          addImage(img);
        } else if (img && typeof img === "object" && "url" in img) {
          addImage(img.url);
        }
      }
    }
  }

  // Supplement from page images until we have 2–8
  for (const img of pageImages) {
    if (images.length >= 20) break;
    addImage(img.src);
  }

  return images.slice(0, 20);
}

/**
 * Parse ISO 8601 duration (PT1H30M, PT45M, etc.) to minutes.
 * Also handles plain text like "45 minutes", "1 hour 30 minutes".
 */
function parseDuration(duration?: unknown): number | null {
  if (!duration) return null;

  // JSON-LD may provide a number (minutes) instead of a string
  if (typeof duration === "number") return duration > 0 ? Math.round(duration) : null;
  if (typeof duration !== "string") return null;

  const d = duration.trim();

  // ISO 8601: PT1H30M, PT45M, PT2H, etc.
  const isoMatch = d.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i
  );
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || "0", 10);
    const minutes = parseInt(isoMatch[2] || "0", 10);
    const total = hours * 60 + minutes;
    return total > 0 ? total : null;
  }

  // Plain text: "1 hour 30 minutes", "45 minutes", "2 hrs"
  let totalMinutes = 0;
  const hourMatch = d.match(/(\d+)\s*(?:hour|hr)s?/i);
  const minMatch = d.match(/(\d+)\s*(?:minute|min)s?/i);

  if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);

  return totalMinutes > 0 ? totalMinutes : null;
}

/**
 * Parse recipeYield (e.g., "4 servings", "12 cookies", "6") to integer.
 */
export function parseServings(value?: unknown): number | null {
  if (!value) return null;

  // JSON-LD may provide a plain number
  if (typeof value === "number") return value > 0 ? Math.round(value) : null;

  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  // Array element or value itself could be a number
  if (typeof raw === "number") return raw > 0 ? Math.round(raw) : null;
  if (typeof raw !== "string") return null;

  const match = raw.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse numeric value from nutrition strings like "250 calories", "12 g", "12g", "12".
 */
function parseNutritionValue(value?: unknown): number | null {
  if (!value) return null;

  // JSON-LD may provide a plain number
  if (typeof value === "number") return value > 0 ? Math.round(value) : null;
  if (typeof value !== "string") return null;

  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Math.round(parseFloat(match[1])) : null;
}

/**
 * Extract nutrition data from schema.org NutritionInformation.
 */
export function parseNutrition(nutrition?: SchemaRecipe["nutrition"]): import("@/types").NutritionData | null {
  if (!nutrition) return null;

  const calories = parseNutritionValue(nutrition.calories);
  const fat = parseNutritionValue(nutrition.fatContent);
  const protein = parseNutritionValue(nutrition.proteinContent);
  const carbs = parseNutritionValue(nutrition.carbohydrateContent);
  const fiber = parseNutritionValue(nutrition.fiberContent);
  const sugar = parseNutritionValue(nutrition.sugarContent);
  const sodium = parseNutritionValue(nutrition.sodiumContent);

  // Only return if we got at least one value
  if (calories === null && fat === null && protein === null && carbs === null) {
    return null;
  }

  return { calories, fat, protein, carbs, fiber, sugar, sodium, estimated: false };
}

function matchTags(sources: string[], validTags: string[]): string[] {
  const matched = new Set<string>();
  const validLower = validTags.map((t) => t.toLowerCase());

  for (const source of sources) {
    const sourceLower = source.toLowerCase().trim();
    for (let i = 0; i < validLower.length; i++) {
      if (
        sourceLower === validLower[i] ||
        sourceLower.includes(validLower[i])
      ) {
        matched.add(validTags[i]);
      }
    }
  }

  return Array.from(matched);
}

function matchDietary(sources: string[]): string[] {
  const matched = new Set<string>();

  for (const source of sources) {
    const sourceLower = source.toLowerCase().trim();
    for (const [key, value] of Object.entries(DIETARY_MAP)) {
      if (sourceLower.includes(key)) {
        matched.add(value);
      }
    }
  }

  return Array.from(matched);
}

function normalizeStringOrArray(value?: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    // Handle comma-separated values
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ");
}

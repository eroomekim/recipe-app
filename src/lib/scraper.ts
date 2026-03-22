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

// ─── Page Fetcher ────────────────────────────────────────────────────────────

export async function scrapePage(url: string): Promise<ScrapedPage> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RecipeBook/1.0; +https://recipebook.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: HTTP ${response.status}`);
  }

  const html = await response.text();
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
  $(
    '[class*="ad-"], [class*="sidebar"], [class*="comment"], [id*="ad-"], [id*="sidebar"], [id*="comment"], [class*="social"], [class*="share"], [class*="related-posts"]'
  ).remove();

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

  if (page.jsonLd) {
    return extractFromJsonLd(page.jsonLd, page.images, page.url, notes);
  }

  // Fallback: parse from HTML structure
  return extractFromHtml(page.html, page.images, page.url, notes);
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

function extractFromHtml(
  html: string,
  pageImages: ImageCandidate[],
  baseUrl: string,
  notes: RecipeNotes
): ExtractedRecipe {
  const $ = cheerio.load(html);

  // ── Title: look for common recipe title selectors ──
  const title =
    $(
      'h1, h2.wprm-recipe-name, .recipe-title, [class*="recipe-name"], [class*="recipe-title"]'
    )
      .first()
      .text()
      .trim() || "Untitled Recipe";

  // ── Ingredients: look for common recipe card patterns ──
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

  // ── Instructions: look for common recipe card patterns ──
  const instructions: string[] = [];
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
      if (text) instructions.push(text);
    });
    if (instructions.length > 0) break;
  }

  // ── Images: pick from page images ──
  const images = pageImages.slice(0, 20).map((img) => img.src);

  // ── Cook time from HTML ──
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
): string[] {
  if (!raw) return [];

  // Plain string — split on newlines or numbered steps
  if (typeof raw === "string") {
    return stripHtml(raw)
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);
  }

  // Array of strings
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string") {
    return (raw as string[])
      .map((s) => stripHtml(s).trim())
      .filter(Boolean);
  }

  // Array of HowToStep / HowToSection objects
  if (Array.isArray(raw)) {
    const steps: string[] = [];
    for (const item of raw as SchemaInstruction[]) {
      if (item["@type"] === "HowToSection" && item.itemListElement) {
        for (const sub of item.itemListElement) {
          const text = sub.text || sub.name || "";
          if (text) steps.push(stripHtml(text).trim());
        }
      } else {
        const text = item.text || item.name || "";
        if (text) steps.push(stripHtml(text).trim());
      }
    }
    return steps.filter(Boolean);
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
function parseDuration(duration?: string | null): number | null {
  if (!duration) return null;

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
export function parseServings(value?: string | string[] | null): number | null {
  if (!value) return null;
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) return null;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse numeric value from nutrition strings like "250 calories", "12 g", "12g", "12".
 */
function parseNutritionValue(value?: string | null): number | null {
  if (!value) return null;
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

function normalizeStringOrArray(value?: string | string[]): string[] {
  if (!value) return [];
  if (typeof value === "string") {
    // Handle comma-separated values
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return value;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ");
}

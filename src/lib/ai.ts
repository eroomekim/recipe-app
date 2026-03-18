import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedRecipe } from "@/types";

interface ImageInfo {
  src: string;
  alt: string;
}

interface ScrapedPage {
  html: string;
  images: ImageInfo[];
}

export async function scrapeRecipePage(url: string): Promise<ScrapedPage> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RecipeBook/1.0; +https://recipebook.app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove non-content elements
  $("script, style, nav, footer, header, iframe, noscript, svg").remove();
  $('[class*="ad"], [class*="sidebar"], [class*="comment"], [id*="ad"], [id*="sidebar"], [id*="comment"]').remove();

  // Collect images
  const images: ImageInfo[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const alt = $(el).attr("alt") || "";
    if (src && !src.includes("logo") && !src.includes("icon") && !src.includes("avatar")) {
      // Resolve relative URLs
      let absoluteSrc = src;
      try {
        absoluteSrc = new URL(src, url).href;
      } catch {
        // skip malformed URLs
        return;
      }
      images.push({ src: absoluteSrc, alt });
    }
  });

  // Get cleaned text content
  const bodyHtml = $("body").html() || "";

  return { html: bodyHtml, images };
}

export async function extractRecipe(
  html: string,
  images: ImageInfo[],
): Promise<ExtractedRecipe> {
  const client = new Anthropic();

  // Truncate HTML to avoid excessive tokens
  const truncatedHtml = html.slice(0, 30_000);
  const imageList = images
    .slice(0, 20)
    .map((img, i) => `${i + 1}. ${img.src} (alt: ${img.alt})`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract the recipe from this web page content. Return ONLY valid JSON matching this exact shape:

{
  "title": "Recipe Title",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "images": ["url1", "url2"],
  "suggestedMealTypes": ["Dinner"],
  "suggestedCuisines": ["Italian"],
  "suggestedDietary": ["Vegetarian"],
  "suggestedCookTimeMinutes": 45
}

Rules:
- Extract the recipe title, ingredients list, and step-by-step instructions
- For images: select 2-8 images that show the food or cooking steps. Skip logos, ads, author photos, icons. Choose from this list:
${imageList}
- For suggestedMealTypes: choose from [Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer]
- For suggestedCuisines: choose from [Italian, Mexican, Thai, Japanese, Indian, French, American, Mediterranean, Chinese, Korean, Vietnamese, Middle Eastern, Greek, Other]
- For suggestedDietary: choose from [Vegan, Vegetarian, Gluten-Free, Dairy-Free, Keto, Paleo, Nut-Free, Low-Carb]. Only include if clearly applicable.
- For suggestedCookTimeMinutes: estimate total active + passive cook time in minutes, or null if unclear
- Return ONLY the JSON, no markdown, no explanation

Page content:
${truncatedHtml}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON from response, handling possible markdown code blocks
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  // Validate and return
  return {
    title: parsed.title ?? "Untitled Recipe",
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
    images: Array.isArray(parsed.images) ? parsed.images : [],
    suggestedMealTypes: Array.isArray(parsed.suggestedMealTypes)
      ? parsed.suggestedMealTypes
      : [],
    suggestedCuisines: Array.isArray(parsed.suggestedCuisines)
      ? parsed.suggestedCuisines
      : [],
    suggestedDietary: Array.isArray(parsed.suggestedDietary)
      ? parsed.suggestedDietary
      : [],
    suggestedCookTimeMinutes: parsed.suggestedCookTimeMinutes ?? null,
  };
}

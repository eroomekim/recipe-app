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

// HEIC/HEIF files are converted to JPEG by the API route before reaching this function
type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

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

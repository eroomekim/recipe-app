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
- Suggest meal types from: Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer, Sandwich, Salad, Sauce, Dressing.
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
      nutrition: null,
    };
  }
}

export function getStructurer(): RecipeStructurerInterface | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new AnthropicRecipeStructurer();
}

import Anthropic from "@anthropic-ai/sdk";
import type { NutritionData } from "@/types";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

/**
 * Estimate nutrition per serving using AI.
 * Returns null if API key is not set or estimation fails.
 */
export async function estimateNutrition(
  ingredients: string[],
  servings: number | null
): Promise<NutritionData | null> {
  if (!process.env.ANTHROPIC_API_KEY || ingredients.length === 0) {
    return null;
  }

  try {
    const servingText = servings ? `The recipe makes ${servings} servings.` : "Assume 4 servings if not clear.";

    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Estimate the nutrition facts PER SERVING for a recipe with these ingredients:

${ingredients.map((i) => `- ${i}`).join("\n")}

${servingText}

Respond with ONLY this JSON (no explanation):
{"calories":0,"fat":0,"protein":0,"carbs":0,"fiber":0,"sugar":0,"sodium":0}

Use whole numbers. Fat/protein/carbs/fiber/sugar in grams. Sodium in milligrams. Be reasonable and conservative.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      calories: parsed.calories ?? null,
      fat: parsed.fat ?? null,
      protein: parsed.protein ?? null,
      carbs: parsed.carbs ?? null,
      fiber: parsed.fiber ?? null,
      sugar: parsed.sugar ?? null,
      sodium: parsed.sodium ?? null,
      estimated: true,
    };
  } catch (error) {
    console.error("Nutrition estimation failed:", error);
    return null;
  }
}

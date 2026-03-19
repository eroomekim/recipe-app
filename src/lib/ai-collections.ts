import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import type { SmartCollectionData } from "@/types";

let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

interface RecipeSummary {
  id: string;
  title: string;
  images: string[];
  tags: string[];
  ingredients: string[];
}

export async function getAiCuratedCollections(
  userId: string,
  recipes: RecipeSummary[]
): Promise<SmartCollectionData[]> {
  if (!process.env.ANTHROPIC_API_KEY || recipes.length < 3) {
    return [];
  }

  const cached = await prisma.smartCollectionCache.findMany({
    where: { userId },
  });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const validCache = cached.filter((c) => c.generatedAt > oneDayAgo);
  if (validCache.length > 0) {
    return validCache.map((c) => ({
      id: `ai-${c.type}`,
      name: c.type === "seasonal" ? getSeasonalName() : "Featured",
      type: "ai" as const,
      recipeIds: c.recipeIds,
      recipeCount: c.recipeIds.length,
      previewImages: getPreviewImages(c.recipeIds, recipes),
    }));
  }

  try {
    const result = await generateAiCollections(recipes);

    for (const collection of result) {
      await prisma.smartCollectionCache.upsert({
        where: { userId_type: { userId, type: collection.cacheType } },
        create: {
          userId,
          type: collection.cacheType,
          recipeIds: collection.recipeIds,
        },
        update: {
          recipeIds: collection.recipeIds,
          generatedAt: now,
        },
      });
    }

    return result.map((c) => ({
      id: `ai-${c.cacheType}`,
      name: c.name,
      type: "ai" as const,
      recipeIds: c.recipeIds,
      recipeCount: c.recipeIds.length,
      previewImages: getPreviewImages(c.recipeIds, recipes),
    }));
  } catch (error) {
    console.error("AI collections generation failed:", error);
    return [];
  }
}

interface AiCollectionResult {
  cacheType: string;
  name: string;
  recipeIds: string[];
}

async function generateAiCollections(
  recipes: RecipeSummary[]
): Promise<AiCollectionResult[]> {
  const recipeList = recipes
    .map((r) => `- ID: ${r.id} | "${r.title}" | Tags: ${r.tags.join(", ")} | Key ingredients: ${r.ingredients.slice(0, 5).join(", ")}`)
    .join("\n");

  const season = getCurrentSeason();

  const message = await getAnthropicClient().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are curating a personal recipe collection. Given these recipes, suggest:

1. A "${season}" seasonal collection (3-8 recipes that fit the current season)
2. A single "Featured" recipe pick (the most interesting/appealing one for right now)

Recipes:
${recipeList}

Respond in JSON only:
{
  "seasonal": { "name": "Spring Vegetables", "recipeIds": ["id1", "id2"] },
  "featured": { "recipeId": "id1" }
}

Use exact recipe IDs from the list. Only include recipes that genuinely fit. If no recipes fit a category, use an empty array.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  const results: AiCollectionResult[] = [];

  const validIds = new Set(recipes.map((r) => r.id));

  if (parsed.seasonal?.recipeIds?.length > 0) {
    const ids = parsed.seasonal.recipeIds.filter((id: string) => validIds.has(id));
    if (ids.length > 0) {
      results.push({
        cacheType: "seasonal",
        name: parsed.seasonal.name || getSeasonalName(),
        recipeIds: ids,
      });
    }
  }

  if (parsed.featured?.recipeId && validIds.has(parsed.featured.recipeId)) {
    results.push({
      cacheType: "featured",
      name: "Featured",
      recipeIds: [parsed.featured.recipeId],
    });
  }

  return results;
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

function getSeasonalName(): string {
  return `${getCurrentSeason()} Picks`;
}

function getPreviewImages(recipeIds: string[], recipes: RecipeSummary[]): string[] {
  return recipeIds
    .slice(0, 3)
    .map((id) => recipes.find((r) => r.id === id)?.images[0])
    .filter(Boolean) as string[];
}

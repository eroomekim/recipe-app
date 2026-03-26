// src/types/index.ts

export interface SubstitutionData {
  ingredient: string;
  substitute: string;
  notes?: string;
}

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  instructions: Array<{ text: string; imageUrl?: string }>;
  images: string[];
  suggestedMealTypes: string[];
  suggestedCuisines: string[];
  suggestedDietary: string[];
  suggestedCookTimeMinutes: number | null;
  // New fields
  servings: number | null;
  substitutions: SubstitutionData[];
  storageTips: string;
  makeAheadNotes: string;
  servingSuggestions: string;
  techniqueNotes: string;
  nutrition: NutritionData | null;
}

export interface CreateRecipeRequest {
  title: string;
  sourceUrl?: string;
  cookTime?: number;
  images: string[];
  ingredients: string[];
  instructions: Array<string | { text: string; imageUrl?: string }>;
  mealTypes: string[];
  cuisines: string[];
  dietary: string[];
  // New fields
  servings?: number;
  substitutions?: SubstitutionData[];
  storageTips?: string;
  makeAheadNotes?: string;
  servingSuggestions?: string;
  techniqueNotes?: string;
  nutrition?: NutritionData | null;
}

export interface RecipeCardData {
  id: string;
  title: string;
  images: string[];
  cookTime: number | null;
  createdAt: string;
  ingredientCount: number;
  instructionCount: number;
  firstInstruction: string | null;
  isFavorite: boolean;
  tags: {
    name: string;
    type: "MEAL_TYPE" | "CUISINE" | "DIETARY";
  }[];
  nutrition: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
  } | null;
}

export interface RecipeDetail {
  id: string;
  title: string;
  sourceUrl: string | null;
  cookTime: number | null;
  images: string[];
  createdAt: string;
  servings: number | null;
  storageTips: string | null;
  makeAheadNotes: string | null;
  servingSuggestions: string | null;
  techniqueNotes: string | null;
  personalNotes: string | null;
  personalAdaptations: string | null;
  isFavorite: boolean;
  nutrition: NutritionData | null;
  ingredients: {
    id: string;
    text: string;
    order: number;
    quantity: number | null;
    unit: string | null;
    name: string | null;
  }[];
  instructions: {
    id: string;
    text: string;
    order: number;
    imageUrl: string | null;
  }[];
  substitutions: {
    id: string;
    ingredient: string;
    substitute: string;
    notes: string | null;
    order: number;
  }[];
  tags: {
    name: string;
    type: "MEAL_TYPE" | "CUISINE" | "DIETARY";
  }[];
}

export interface NutritionData {
  calories: number | null;
  fat: number | null;
  protein: number | null;
  carbs: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  estimated: boolean;
}

export interface CollectionData {
  id: string;
  name: string;
  description: string | null;
  recipeCount: number;
  previewImages: string[];
}

export interface SmartCollectionData {
  id: string;
  name: string;
  type: "rule" | "ai";
  recipeIds: string[];
  recipeCount: number;
  previewImages: string[];
}

export interface SimilarRecipe {
  id: string;
  title: string;
  images: string[];
  cookTime: number | null;
  sharedIngredientCount: number;
  similarityScore: number;
  tags: {
    name: string;
    type: string;
  }[];
}

export interface ScaledIngredient {
  text: string;
  scaledText: string;
  quantity: number | null;
  scaledQuantity: number | null;
  unit: string | null;
  name: string | null;
  checked: boolean;
}

export type AltitudeSetting = "sea_level" | "moderate" | "high" | "very_high";
export type EquipmentType = "convection_oven" | "instant_pot" | "air_fryer" | "slow_cooker";

export interface UserSettingsData {
  measurementSystem: "imperial" | "metric";
  maxDisplayImages: number;
  defaultServings: number | null;
  cookingAutoReadAloud: boolean;
  cookingKeepAwake: boolean;
  altitude: AltitudeSetting | null;
  equipment: EquipmentType[];
}

export const DEFAULT_SETTINGS: UserSettingsData = {
  measurementSystem: "imperial",
  maxDisplayImages: 8,
  defaultServings: null,
  cookingAutoReadAloud: false,
  cookingKeepAwake: true,
  altitude: null,
  equipment: [],
};

// --- Smart Features Types ---

export interface IngredientMatchResult {
  recipe: RecipeCardData;
  matchedCount: number;
  totalCount: number;
  coveragePercent: number;
  missingIngredients: string[];
}

export interface SeasonalRecipe {
  recipe: RecipeCardData;
  seasonalScore: number;
  seasonalIngredients: string[];
}

export interface SimilarRecipe {
  id: string;
  title: string;
  images: string[];
  cookTime: number | null;
  sharedIngredientCount: number;
  similarityScore: number;
  tags: { name: string; type: "MEAL_TYPE" | "CUISINE" | "DIETARY" }[];
}

export interface CookTimeAdjustment {
  originalMinutes: number;
  adjustedMinutes: number;
  label: string;
}

export type ExtractResponse =
  | {
      type: "immediate";
      recipe: ExtractedRecipe;
      sourceUrl: string;
      _meta: { method: string; platform: "blog" };
    }
  | {
      type: "async";
      jobId: string;
      status: "processing";
    };

export interface JobPollResponse {
  status: "pending" | "processing" | "completed" | "failed";
  stage: string | null;
  recipe: ExtractedRecipe | null;
  sourceUrl: string | null;
  _meta: { method: string; platform: string } | null;
  error: string | null;
  linkedBlogUrl: string | null;
}

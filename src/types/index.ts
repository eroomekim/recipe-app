// src/types/index.ts

export interface SubstitutionData {
  ingredient: string;
  substitute: string;
  notes?: string;
}

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
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
}

export interface CreateRecipeRequest {
  title: string;
  sourceUrl?: string;
  cookTime?: number;
  images: string[];
  ingredients: string[];
  instructions: string[];
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

export interface ScaledIngredient {
  text: string;
  scaledText: string;
  quantity: number | null;
  scaledQuantity: number | null;
  unit: string | null;
  name: string | null;
  checked: boolean;
}

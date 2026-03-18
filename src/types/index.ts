export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  images: string[];
  suggestedMealTypes: string[];
  suggestedCuisines: string[];
  suggestedDietary: string[];
  suggestedCookTimeMinutes: number | null;
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
  ingredients: {
    id: string;
    text: string;
    order: number;
  }[];
  instructions: {
    id: string;
    text: string;
    order: number;
  }[];
  tags: {
    name: string;
    type: "MEAL_TYPE" | "CUISINE" | "DIETARY";
  }[];
}

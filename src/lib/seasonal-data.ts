/**
 * Maps common ingredient names (lowercase) to their peak season months (1-12).
 */
export const INGREDIENT_SEASONS: Record<string, number[]> = {
  // Spring (March-May)
  asparagus: [3, 4, 5],
  artichoke: [3, 4, 5],
  pea: [3, 4, 5, 6],
  radish: [3, 4, 5],
  rhubarb: [3, 4, 5, 6],
  "spring onion": [3, 4, 5],
  spinach: [3, 4, 5, 9, 10],
  arugula: [3, 4, 5, 9, 10],
  leek: [1, 2, 3, 10, 11, 12],
  mint: [4, 5, 6, 7, 8],

  // Summer (June-August)
  tomato: [6, 7, 8, 9],
  corn: [6, 7, 8],
  zucchini: [6, 7, 8],
  "bell pepper": [6, 7, 8, 9],
  pepper: [6, 7, 8, 9],
  cucumber: [6, 7, 8],
  eggplant: [7, 8, 9],
  peach: [6, 7, 8],
  watermelon: [6, 7, 8],
  blueberry: [6, 7, 8],
  strawberry: [5, 6, 7],
  raspberry: [6, 7, 8],
  basil: [6, 7, 8, 9],
  cherry: [5, 6, 7],
  fig: [7, 8, 9],
  melon: [6, 7, 8],
  okra: [6, 7, 8, 9],
  "green bean": [6, 7, 8],

  // Fall (September-November)
  "butternut squash": [9, 10, 11],
  squash: [9, 10, 11],
  pumpkin: [9, 10, 11],
  apple: [9, 10, 11],
  pear: [9, 10, 11],
  cranberry: [9, 10, 11],
  "sweet potato": [9, 10, 11, 12],
  "brussels sprout": [9, 10, 11, 12],
  cauliflower: [9, 10, 11],
  grape: [8, 9, 10],
  pomegranate: [10, 11, 12],
  parsnip: [10, 11, 12, 1, 2],
  turnip: [10, 11, 12],
  beet: [9, 10, 11],

  // Winter (December-February)
  "citrus": [12, 1, 2, 3],
  orange: [12, 1, 2, 3],
  lemon: [12, 1, 2, 3],
  lime: [12, 1, 2, 3],
  grapefruit: [12, 1, 2, 3],
  kale: [11, 12, 1, 2],
  cabbage: [11, 12, 1, 2, 3],
  "collard green": [12, 1, 2],
  celery: [10, 11, 12, 1],
  "winter squash": [10, 11, 12, 1],

  // Year-round staples with peak seasons
  carrot: [6, 7, 8, 9, 10],
  onion: [8, 9, 10],
  potato: [9, 10, 11],
  mushroom: [9, 10, 11],
  broccoli: [9, 10, 11, 3, 4, 5],
  garlic: [7, 8, 9],
  ginger: [9, 10, 11],
  avocado: [3, 4, 5, 6],
};

/**
 * Cultural/holiday meal type and cuisine associations by month.
 */
export const CULTURAL_ASSOCIATIONS: Record<number, { mealTypes: string[]; cuisines: string[]; keywords: string[] }> = {
  1: { mealTypes: ["Dinner"], cuisines: [], keywords: ["soup", "stew", "braise", "warm", "comfort"] },
  2: { mealTypes: ["Dinner", "Dessert"], cuisines: ["French", "Italian"], keywords: ["chocolate", "romantic", "comfort"] },
  3: { mealTypes: ["Lunch", "Dinner"], cuisines: [], keywords: ["fresh", "spring", "light", "salad"] },
  4: { mealTypes: ["Brunch", "Dinner"], cuisines: [], keywords: ["spring", "Easter", "brunch", "lamb"] },
  5: { mealTypes: ["Lunch", "Dinner"], cuisines: ["Mexican"], keywords: ["grill", "fresh", "spring", "salad"] },
  6: { mealTypes: ["Lunch", "Dinner"], cuisines: ["Mediterranean", "Greek"], keywords: ["grill", "barbecue", "salad", "fresh"] },
  7: { mealTypes: ["Lunch", "Dinner", "Snack"], cuisines: ["American", "Mediterranean"], keywords: ["grill", "barbecue", "cold", "fresh", "salad", "summer"] },
  8: { mealTypes: ["Lunch", "Dinner"], cuisines: ["Mediterranean", "Italian"], keywords: ["grill", "summer", "fresh", "tomato"] },
  9: { mealTypes: ["Dinner"], cuisines: [], keywords: ["roast", "harvest", "fall", "apple", "comfort"] },
  10: { mealTypes: ["Dinner", "Dessert", "Snack"], cuisines: [], keywords: ["pumpkin", "spice", "fall", "harvest", "soup"] },
  11: { mealTypes: ["Dinner"], cuisines: ["American"], keywords: ["roast", "thanksgiving", "turkey", "pie", "bake", "comfort"] },
  12: { mealTypes: ["Dinner", "Dessert", "Appetizer"], cuisines: [], keywords: ["bake", "cookie", "holiday", "roast", "comfort", "warm"] },
};

/**
 * Check if an ingredient name matches any seasonal ingredient for the given month.
 */
export function getSeasonalMatch(ingredientName: string, month: number): string | null {
  const normalized = ingredientName.toLowerCase().trim();
  for (const [seasonal, months] of Object.entries(INGREDIENT_SEASONS)) {
    if (months.includes(month) && normalized.includes(seasonal)) {
      return seasonal;
    }
  }
  return null;
}

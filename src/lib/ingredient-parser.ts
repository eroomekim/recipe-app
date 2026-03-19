export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1/3, "⅔": 2/3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1/6, "⅚": 5/6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

const UNITS = new Set([
  "cup", "cups", "c",
  "tablespoon", "tablespoons", "tbsp", "tbs", "T",
  "teaspoon", "teaspoons", "tsp", "t",
  "ounce", "ounces", "oz",
  "pound", "pounds", "lb", "lbs",
  "gram", "grams", "g",
  "kilogram", "kilograms", "kg",
  "milliliter", "milliliters", "ml",
  "liter", "liters", "l",
  "gallon", "gallons", "gal",
  "quart", "quarts", "qt",
  "pint", "pints", "pt",
  "stick", "sticks",
  "can", "cans",
  "package", "packages", "pkg",
  "bunch", "bunches",
  "head", "heads",
  "slice", "slices",
  "piece", "pieces",
  "sprig", "sprigs",
  "dash", "dashes",
]);

export function parseIngredient(text: string): ParsedIngredient {
  let remaining = text.trim();

  const quantityResult = extractQuantity(remaining);
  if (quantityResult === null) {
    return { quantity: null, unit: null, name: remaining };
  }

  const { quantity, rest } = quantityResult;
  remaining = rest.trim();

  const firstWord = remaining.split(/\s+/)[0]?.replace(/[.,]$/, "");
  if (firstWord && UNITS.has(firstWord.toLowerCase())) {
    const name = remaining.slice(firstWord.length).trim();
    return { quantity, unit: firstWord, name: name || remaining };
  }

  return { quantity, unit: null, name: remaining };
}

function extractQuantity(text: string): { quantity: number; rest: string } | null {
  for (const [char, value] of Object.entries(UNICODE_FRACTIONS)) {
    if (text.startsWith(char)) {
      return { quantity: value, rest: text.slice(char.length) };
    }
  }

  const match = text.match(/^(\d+)\s+(\d+)\/(\d+)\s+(.*)$/);
  if (match) {
    const whole = parseInt(match[1], 10);
    const num = parseInt(match[2], 10);
    const den = parseInt(match[3], 10);
    if (den !== 0) {
      return { quantity: whole + num / den, rest: match[4] };
    }
  }

  const fracMatch = text.match(/^(\d+)\/(\d+)\s+(.*)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den !== 0) {
      return { quantity: num / den, rest: fracMatch[3] };
    }
  }

  const decMatch = text.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
  if (decMatch) {
    return { quantity: parseFloat(decMatch[1]), rest: decMatch[2] };
  }

  return null;
}

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

/**
 * Parse a single numeric value (fraction, mixed number, decimal, or integer).
 * Returns the value and the number of characters consumed.
 */
function parseSingleQuantity(text: string): { value: number; length: number } | null {
  // Unicode fractions
  for (const [char, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (text.startsWith(char)) {
      return { value: val, length: char.length };
    }
  }

  // Mixed number: "1 1/2"
  const mixedMatch = text.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixedMatch && parseInt(mixedMatch[3], 10) !== 0) {
    const val = parseInt(mixedMatch[1], 10) + parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10);
    return { value: val, length: mixedMatch[0].length };
  }

  // Fraction: "1/2"
  const fracMatch = text.match(/^(\d+)\/(\d+)/);
  if (fracMatch && parseInt(fracMatch[2], 10) !== 0) {
    const val = parseInt(fracMatch[1], 10) / parseInt(fracMatch[2], 10);
    return { value: val, length: fracMatch[0].length };
  }

  // Decimal or integer: "1.5" or "4"
  const decMatch = text.match(/^(\d+(?:\.\d+)?)/);
  if (decMatch) {
    return { value: parseFloat(decMatch[1]), length: decMatch[0].length };
  }

  return null;
}

function extractQuantity(text: string): { quantity: number; rest: string } | null {
  const first = parseSingleQuantity(text);
  if (!first) return null;

  let rest = text.slice(first.length).trimStart();

  // Check for range pattern: "4-5", "4 - 5", "1/3 - 1/2", "1-2"
  const rangeMatch = rest.match(/^[-–—]\s*/);
  if (rangeMatch) {
    const afterDash = rest.slice(rangeMatch[0].length);
    const second = parseSingleQuantity(afterDash);
    if (second) {
      // Use the higher value for scaling (better too much than too little)
      rest = afterDash.slice(second.length).trimStart();
      return { quantity: Math.max(first.value, second.value), rest };
    }
  }

  // No range — just return the single value
  if (!rest) return null; // number with nothing after it isn't a quantity pattern
  return { quantity: first.value, rest };
}

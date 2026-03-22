import { parseIngredient } from "./ingredient-parser";

interface IngredientInput {
  text: string;
  quantity: number | null;
  unit: string | null;
  name: string | null;
}

export interface ScaledResult {
  text: string;
  scaledText: string;
  quantity: number | null;
  scaledQuantity: number | null;
  unit: string | null;
  name: string | null;
}

// Quarter fractions take priority; thirds are used when clearly closer
const QUARTER_FRACTIONS: [number, string][] = [
  [1/4, "1/4"],
  [1/2, "1/2"],
  [3/4, "3/4"],
];

const THIRD_FRACTIONS: [number, string][] = [
  [1/3, "1/3"],
  [2/3, "2/3"],
];

function nearestFraction(
  frac: number,
  candidates: [number, string][]
): [number, string] {
  let best = candidates[0];
  let bestDiff = Math.abs(frac - candidates[0][0]);
  for (const candidate of candidates) {
    const diff = Math.abs(frac - candidate[0]);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }
  return best;
}

export function formatQuantity(value: number): string {
  if (value <= 0) return String(value);

  const whole = Math.floor(value);
  const frac = value - whole;

  if (frac < 0.05) return String(whole);
  if (frac > 0.95) return String(whole + 1);

  const [qVal, qStr] = nearestFraction(frac, QUARTER_FRACTIONS);
  const [tVal, tStr] = nearestFraction(frac, THIRD_FRACTIONS);

  const qDiff = Math.abs(frac - qVal);
  const tDiff = Math.abs(frac - tVal);

  // Prefer thirds only when they are meaningfully closer than quarters
  // (more than 0.02 closer), otherwise use quarters
  let bestFrac: string;
  if (tDiff < qDiff - 0.02) {
    bestFrac = tStr;
  } else {
    bestFrac = qStr;
  }

  if (whole > 0) return `${whole} ${bestFrac}`;
  return bestFrac;
}

export function scaleIngredient(
  ingredient: IngredientInput,
  factor: number
): ScaledResult {
  // If structured fields are missing, try to parse on-the-fly
  let { quantity, unit, name } = ingredient;
  if (quantity === null && ingredient.text) {
    const parsed = parseIngredient(ingredient.text);
    quantity = parsed.quantity;
    unit = parsed.unit;
    name = parsed.name;
  }

  const base: ScaledResult = {
    text: ingredient.text,
    scaledText: ingredient.text,
    quantity,
    scaledQuantity: quantity,
    unit,
    name,
  };

  if (quantity === null || factor === 1) {
    return base;
  }

  const scaled = quantity * factor;
  const formatted = formatQuantity(scaled);

  const parts = [formatted];
  if (unit) parts.push(unit);
  if (name) parts.push(name);

  return {
    ...base,
    scaledQuantity: scaled,
    scaledText: parts.join(" "),
  };
}

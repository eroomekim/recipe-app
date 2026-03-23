// Conversion factors: imperial unit → metric equivalent
const CONVERSIONS: Record<string, { unit: string; factor: number }> = {
  // Volume
  cup: { unit: "ml", factor: 236.588 },
  cups: { unit: "ml", factor: 236.588 },
  c: { unit: "ml", factor: 236.588 },
  tablespoon: { unit: "ml", factor: 14.787 },
  tablespoons: { unit: "ml", factor: 14.787 },
  tbsp: { unit: "ml", factor: 14.787 },
  tbs: { unit: "ml", factor: 14.787 },
  teaspoon: { unit: "ml", factor: 4.929 },
  teaspoons: { unit: "ml", factor: 4.929 },
  tsp: { unit: "ml", factor: 4.929 },
  "fluid ounce": { unit: "ml", factor: 29.574 },
  "fluid ounces": { unit: "ml", factor: 29.574 },
  "fl oz": { unit: "ml", factor: 29.574 },
  gallon: { unit: "l", factor: 3.785 },
  gallons: { unit: "l", factor: 3.785 },
  gal: { unit: "l", factor: 3.785 },
  quart: { unit: "ml", factor: 946.353 },
  quarts: { unit: "ml", factor: 946.353 },
  qt: { unit: "ml", factor: 946.353 },
  pint: { unit: "ml", factor: 473.176 },
  pints: { unit: "ml", factor: 473.176 },
  pt: { unit: "ml", factor: 473.176 },
  // Weight
  ounce: { unit: "g", factor: 28.35 },
  ounces: { unit: "g", factor: 28.35 },
  oz: { unit: "g", factor: 28.35 },
  pound: { unit: "g", factor: 453.592 },
  pounds: { unit: "g", factor: 453.592 },
  lb: { unit: "g", factor: 453.592 },
  lbs: { unit: "g", factor: 453.592 },
  // Temperature (handled separately)
};

const METRIC_TO_IMPERIAL: Record<string, { unit: string; factor: number }> = {
  ml: { unit: "tsp", factor: 1 / 4.929 },
  milliliter: { unit: "tsp", factor: 1 / 4.929 },
  milliliters: { unit: "tsp", factor: 1 / 4.929 },
  l: { unit: "cup", factor: 1 / 0.2366 },
  liter: { unit: "cup", factor: 1 / 0.2366 },
  liters: { unit: "cup", factor: 1 / 0.2366 },
  g: { unit: "oz", factor: 1 / 28.35 },
  gram: { unit: "oz", factor: 1 / 28.35 },
  grams: { unit: "oz", factor: 1 / 28.35 },
  kg: { unit: "lb", factor: 1 / 0.4536 },
  kilogram: { unit: "lb", factor: 1 / 0.4536 },
  kilograms: { unit: "lb", factor: 1 / 0.4536 },
};

function smartMetricUnit(unit: string, value: number): { unit: string; value: number } {
  // Upgrade ml → l when >= 1000
  if ((unit === "ml") && value >= 1000) {
    return { unit: "l", value: value / 1000 };
  }
  // Upgrade g → kg when >= 1000
  if ((unit === "g") && value >= 1000) {
    return { unit: "kg", value: value / 1000 };
  }
  return { unit, value };
}

function smartImperialUnit(unit: string, value: number): { unit: string; value: number } {
  // Upgrade tsp → tbsp when >= 3
  if (unit === "tsp" && value >= 3) {
    return { unit: "tbsp", value: value / 3 };
  }
  // Upgrade tbsp → cup when >= 16
  if (unit === "tbsp" && value >= 16) {
    return { unit: "cup", value: value / 16 };
  }
  // Upgrade oz → lb when >= 16
  if (unit === "oz" && value >= 16) {
    return { unit: "lb", value: value / 16 };
  }
  return { unit, value };
}

function formatValue(value: number): string {
  if (value >= 100) return String(Math.round(value));
  if (value >= 10) return String(Math.round(value * 10) / 10);
  return String(Math.round(value * 100) / 100);
}

export function convertUnit(
  quantity: number,
  unit: string,
  targetSystem: "imperial" | "metric"
): { quantity: number; unit: string; converted: boolean } {
  const lowerUnit = unit.toLowerCase().trim();

  if (targetSystem === "metric") {
    const conv = CONVERSIONS[lowerUnit];
    if (!conv) return { quantity, unit, converted: false };
    const raw = quantity * conv.factor;
    const smart = smartMetricUnit(conv.unit, raw);
    return { quantity: parseFloat(formatValue(smart.value)), unit: smart.unit, converted: true };
  } else {
    const conv = METRIC_TO_IMPERIAL[lowerUnit];
    if (!conv) return { quantity, unit, converted: false };
    const raw = quantity * conv.factor;
    const smart = smartImperialUnit(conv.unit, raw);
    return { quantity: parseFloat(formatValue(smart.value)), unit: smart.unit, converted: true };
  }
}

/**
 * Normalizes an ingredient name for matching:
 * - lowercase
 * - trim whitespace
 * - strip trailing 's' or 'es' for basic plural handling
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();
  // Strip common plural suffixes
  if (normalized.endsWith("ies")) {
    normalized = normalized.slice(0, -3) + "y"; // berries -> berry
  } else if (normalized.endsWith("ves")) {
    normalized = normalized.slice(0, -3) + "f"; // halves -> half
  } else if (normalized.endsWith("es") && normalized.length > 3) {
    normalized = normalized.slice(0, -2); // tomatoes -> tomato
  } else if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 2) {
    normalized = normalized.slice(0, -1); // onions -> onion
  }
  return normalized;
}

/**
 * Checks if a user-provided ingredient matches a recipe ingredient name.
 * User input is checked as a substring of the stored name.
 * e.g., "chicken" matches "chicken breast", "chicken thigh"
 */
export function ingredientMatches(userInput: string, recipeIngredientName: string): boolean {
  const normalizedInput = normalizeIngredientName(userInput);
  const normalizedRecipe = normalizeIngredientName(recipeIngredientName);
  return normalizedRecipe.includes(normalizedInput);
}

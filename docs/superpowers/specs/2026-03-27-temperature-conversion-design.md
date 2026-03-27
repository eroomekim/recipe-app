# Temperature Conversion — Design Spec

> Frontend-only temperature conversion tied to the existing Measurement System toggle (Imperial = °F, Metric = °C).

## Summary

Add a `convertTemperatureInText()` utility that regex-matches temperature values in recipe instruction text and converts between °F and °C based on the user's `measurementSystem` setting. No database, API, or schema changes required.

## Approach

Regex-based text replacement at display time. Temperatures in recipe instructions are stored as-is (raw text from source blogs). The conversion is a pure frontend transform applied when rendering.

## Implementation Details

### New utility function

**Location:** `src/lib/unit-converter.ts` (where a `// Temperature (handled separately)` placeholder already exists)

**Function:** `convertTemperatureInText(text: string, targetSystem: "imperial" | "metric"): string`

**Regex patterns to match:**
- `350°F`, `350 °F`, `350°f`
- `350 F`, `350 f` (preceded by a digit)
- `350 degrees F`, `350 degrees Fahrenheit`
- Same patterns for Celsius (`°C`, `C`, `degrees C`, `degrees Celsius`)

**Conversion formulas:**
- °F to °C: `Math.round((f - 32) * 5 / 9)`
- °C to °F: `Math.round(c * 9 / 5 + 32)`

**Behavior:**
- If source unit already matches target system, text is returned unchanged
- Results are rounded to nearest integer
- The degree symbol and unit label in the output use a consistent format: `177°C` or `350°F`

### Components to update

Apply `convertTemperatureInText()` on instruction step text in:

1. **`RecipePage.tsx`** — instruction list rendering
2. **`CookingMode.tsx` / `CookingStep.tsx`** — cooking mode step display

Both components already have access to `measurementSystem` via the settings hook.

### What doesn't change

- No database or API changes
- No new settings field — uses existing `measurementSystem`
- No changes to recipe extraction or storage
- Ingredients are unaffected (temperatures appear in instructions)

### Edge cases

- Already-matching units left unchanged
- Handles optional degree symbol and spacing variations
- Rounds to nearest integer (ovens don't do fractional degrees)
- Written-out temperatures ("three hundred fifty degrees") are not converted (uncommon in blog recipes)

# Temperature Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert temperature values in recipe instruction text between °F and °C based on the user's measurement system setting.

**Architecture:** A single regex-based utility function (`convertTemperatureInText`) replaces temperature strings inline. Applied at display time in RecipePage, CookingStep, and CookingMode speech synthesis. No DB/API changes.

**Tech Stack:** TypeScript, React

---

### Task 1: Add `convertTemperatureInText` utility

**Files:**
- Modify: `src/lib/unit-converter.ts:34` (replace placeholder comment, add function at end)

- [ ] **Step 1: Add the conversion function**

Append to `src/lib/unit-converter.ts`:

```typescript
/**
 * Convert temperature values in text between °F and °C.
 * Matches patterns like: 350°F, 350 °F, 350 degrees Fahrenheit, 180°C, etc.
 */
export function convertTemperatureInText(
  text: string,
  targetSystem: "imperial" | "metric"
): string {
  // Match: number + optional space + optional ° + F/C/Fahrenheit/Celsius
  // Also matches: number + optional space + "degrees" + optional space + F/C/Fahrenheit/Celsius
  const tempRegex = /(\d+(?:\.\d+)?)\s*(?:°\s*|degrees?\s+)?([FfCc](?:ahrenheit|elsius)?)\b/g;

  return text.replace(tempRegex, (match, value, unit) => {
    const temp = parseFloat(value);
    const isFahrenheit = unit[0].toUpperCase() === "F";

    if (isFahrenheit && targetSystem === "metric") {
      const celsius = Math.round((temp - 32) * 5 / 9);
      return `${celsius}°C`;
    }
    if (!isFahrenheit && targetSystem === "imperial") {
      const fahrenheit = Math.round(temp * 9 / 5 + 32);
      return `${fahrenheit}°F`;
    }

    return match;
  });
}
```

- [ ] **Step 2: Remove placeholder comment**

Replace line 34 `// Temperature (handled separately)` with `// Temperature: see convertTemperatureInText below`.

- [ ] **Step 3: Verify build compiles**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: no TypeScript errors related to unit-converter.

- [ ] **Step 4: Commit**

```bash
git add src/lib/unit-converter.ts
git commit -m "feat: add convertTemperatureInText utility for F/C conversion"
```

---

### Task 2: Apply temperature conversion in RecipePage instructions

**Files:**
- Modify: `src/components/recipes/RecipePage.tsx:15,312-313`

- [ ] **Step 1: Import the function**

Add to the imports in `RecipePage.tsx` (line 15, where `convertUnit` is already imported):

```typescript
import { convertUnit, convertTemperatureInText } from "@/lib/unit-converter";
```

- [ ] **Step 2: Apply conversion to instruction text**

In the `instructionsBlock` (around line 312-313), change:

```tsx
<p className="font-serif text-base leading-relaxed text-black">
  {inst.text}
</p>
```

to:

```tsx
<p className="font-serif text-base leading-relaxed text-black">
  {convertTemperatureInText(inst.text, settings.measurementSystem)}
</p>
```

- [ ] **Step 3: Verify build compiles**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/recipes/RecipePage.tsx
git commit -m "feat: apply temperature conversion in recipe instructions"
```

---

### Task 3: Apply temperature conversion in CookingStep and CookingMode

**Files:**
- Modify: `src/components/cooking/CookingStep.tsx:29`
- Modify: `src/components/cooking/CookingMode.tsx:18,58,94,174`

- [ ] **Step 1: Update CookingStep to accept and apply measurementSystem**

In `CookingStep.tsx`, add the import and update the interface and rendering:

```typescript
import { convertTemperatureInText } from "@/lib/unit-converter";

interface CookingStepProps {
  stepNumber: number;
  totalSteps: number;
  text: string;
  measurementSystem?: "imperial" | "metric";
}

export default function CookingStep({ stepNumber, totalSteps, text, measurementSystem = "imperial" }: CookingStepProps) {
```

Change the text rendering (line 29) from:

```tsx
{text}
```

to:

```tsx
{convertTemperatureInText(text, measurementSystem)}
```

- [ ] **Step 2: Update CookingMode to pass measurementSystem**

In `CookingMode.tsx`, add the import and prop:

```typescript
import { convertTemperatureInText } from "@/lib/unit-converter";
```

Add `measurementSystem` to the interface and destructure:

```typescript
interface CookingModeProps {
  recipe: RecipeDetail;
  onExit: () => void;
  defaultAutoReadAloud?: boolean;
  defaultKeepAwake?: boolean;
  measurementSystem?: "imperial" | "metric";
}

export default function CookingMode({ recipe, onExit, defaultAutoReadAloud = false, defaultKeepAwake = true, measurementSystem = "imperial" }: CookingModeProps) {
```

Pass it to CookingStep (around line 174):

```tsx
<CookingStep
  stepNumber={currentStep + 1}
  totalSteps={recipe.instructions.length}
  text={recipe.instructions[currentStep].text}
  measurementSystem={measurementSystem}
/>
```

Also apply conversion to the speech synthesis text (lines 58 and 94):

Line 58:
```typescript
const utterance = new SpeechSynthesisUtterance(convertTemperatureInText(recipe.instructions[currentStep].text, measurementSystem));
```

Line 94:
```typescript
const utterance = new SpeechSynthesisUtterance(convertTemperatureInText(recipe.instructions[currentStep].text, measurementSystem));
```

- [ ] **Step 3: Pass measurementSystem from RecipePage to CookingMode**

In `RecipePage.tsx` (around line 100-106), update the CookingMode render:

```tsx
<CookingMode
  recipe={recipe}
  onExit={() => setCooking(false)}
  defaultAutoReadAloud={settings.cookingAutoReadAloud}
  defaultKeepAwake={settings.cookingKeepAwake}
  measurementSystem={settings.measurementSystem}
/>
```

- [ ] **Step 4: Verify build compiles**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/cooking/CookingStep.tsx src/components/cooking/CookingMode.tsx src/components/recipes/RecipePage.tsx
git commit -m "feat: apply temperature conversion in cooking mode and speech"
```

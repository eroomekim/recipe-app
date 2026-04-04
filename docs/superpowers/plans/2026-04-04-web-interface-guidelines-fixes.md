# Web Interface Guidelines Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all violations found during the Web Interface Guidelines audit across accessibility, forms, animation, images, and navigation.

**Architecture:** Small, targeted fixes across existing components — no new abstractions, no new files. Each task touches one or two related files and can be committed independently. URL filter sync is the only structural change (FilterBar + recipes page).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS v4, React

---

## File Map

| File | What changes |
|---|---|
| `src/app/layout.tsx` | Remove zoom-disable viewport settings |
| `src/app/globals.css` | Add `prefers-reduced-motion` guard for `slideUp` |
| `src/components/ui/Input.tsx` | Add `htmlFor`/`id` linking; switch to `focus-visible` |
| `src/components/auth/LoginForm.tsx` | Fix label links; add `autocomplete`, `name`, `spellCheck` |
| `src/components/auth/SignupForm.tsx` | Same as LoginForm |
| `src/components/layout/MobileMenu.tsx` | Guard slide/fade transitions with `prefers-reduced-motion` |
| `src/components/recipes/RecipePage.tsx` | Add keyboard handler + `role`/`tabIndex` to ingredient `<li>` |
| `src/components/recipes/ImportForm.tsx` | Label unlabeled inputs; fix `<img>` dimensions; fix `...` → `…` |
| `src/components/recipes/EditRecipeForm.tsx` | Label unlabeled inputs; fix `<img>` dimensions |
| `src/components/recipes/ImageLightbox.tsx` | Add `aria-label` to thumbnail buttons |
| `src/components/grocery/GroceryList.tsx` | Add `aria-label` to text input and icon-only Add button |
| `src/components/pantry/PantrySearch.tsx` | Add `aria-label` to ingredient input; fix `<img>` dimensions |
| `src/components/recipes/FilterBar.tsx` | Sync filter state to URL via `useSearchParams` |
| `src/app/recipes/page.tsx` | Read initial filter state from search params; pass to FilterBar |

---

## Task 1: Remove zoom-disable anti-pattern

**Files:**
- Modify: `src/app/layout.tsx:30-37`

- [ ] **Step 1: Remove `maximumScale` and `userScalable` from viewport export**

```tsx
// src/app/layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: remove zoom-disabling viewport settings (WCAG anti-pattern)"
```

---

## Task 2: Fix Input.tsx — label linking and focus-visible

**Files:**
- Modify: `src/components/ui/Input.tsx`

The `<label>` needs `htmlFor` and the `<input>` needs a matching `id`. We derive the `id` from the `label` prop (lowercased, spaces replaced with `-`). We also switch `focus:outline-none focus:border-black` to `focus-visible:outline-none focus-visible:border-black` so keyboard users get the global focus ring, while pointer users don't.

- [ ] **Step 1: Update Input.tsx**

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors ${error ? "border-red" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 font-sans text-sm text-red-dark">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Input.tsx
git commit -m "fix: link label to input via htmlFor/id; use focus-visible for outline"
```

---

## Task 3: Fix LoginForm — label links, autocomplete, name, spellCheck

**Files:**
- Modify: `src/components/auth/LoginForm.tsx`

- [ ] **Step 1: Update the email and password fields**

Replace the two `<div>` blocks containing label+input (lines 52–77) with:

```tsx
<div>
  <label
    htmlFor="login-email"
    className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
  >
    Email
  </label>
  <input
    id="login-email"
    name="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="you@example.com"
    autoComplete="email"
    spellCheck={false}
    required
    className="w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
  />
</div>

<div>
  <label
    htmlFor="login-password"
    className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
  >
    Password
  </label>
  <input
    id="login-password"
    name="password"
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Your password"
    autoComplete="current-password"
    required
    className="w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
  />
</div>
```

Also update the submit button loading text:

```tsx
{loading ? "Signing in…" : "Sign In"}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/LoginForm.tsx
git commit -m "fix: link labels to inputs; add autocomplete/name/spellCheck on login form"
```

---

## Task 4: Fix SignupForm — label links, autocomplete, name, spellCheck

**Files:**
- Modify: `src/components/auth/SignupForm.tsx`

- [ ] **Step 1: Update the email and password fields**

Replace the two `<div>` blocks containing label+input (lines 52–78) with:

```tsx
<div>
  <label
    htmlFor="signup-email"
    className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
  >
    Email
  </label>
  <input
    id="signup-email"
    name="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="you@example.com"
    autoComplete="email"
    spellCheck={false}
    required
    className="w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
  />
</div>

<div>
  <label
    htmlFor="signup-password"
    className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
  >
    Password
  </label>
  <input
    id="signup-password"
    name="password"
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="At least 6 characters"
    autoComplete="new-password"
    required
    minLength={6}
    className="w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
  />
</div>
```

Also update submit button loading text:

```tsx
{loading ? "Creating account…" : "Create Account"}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/SignupForm.tsx
git commit -m "fix: link labels to inputs; add autocomplete/name/spellCheck on signup form"
```

---

## Task 5: Add prefers-reduced-motion guards for slideUp and MobileMenu

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/layout/MobileMenu.tsx`

### globals.css

- [ ] **Step 1: Add reduced-motion guard for animate-slideUp in globals.css**

Add this block after the existing `@media (prefers-reduced-motion: reduce)` block (after line 132):

```css
@media (prefers-reduced-motion: reduce) {
  .animate-slideUp {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

### MobileMenu.tsx

- [ ] **Step 2: Read reduced-motion preference and skip transitions**

Add a `useReducedMotion` hook inline (no new file — one import). Import `useEffect` and `useState` are already imported. Add after the existing state declarations (after line 22):

```tsx
const [reducedMotion, setReducedMotion] = useState(false);
useEffect(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  setReducedMotion(mq.matches);
  const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}, []);
```

Then update the backdrop div's className (line 46) to skip transition when reduced:

```tsx
className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${
  reducedMotion ? "" : "transition-opacity duration-300"
} ${visible ? "opacity-100" : "opacity-0"}`}
```

And the slide panel's className (line 54) similarly:

```tsx
className={`absolute left-0 top-0 bottom-0 w-64 bg-white p-6 flex flex-col gap-6 ${
  reducedMotion ? "" : "transition-transform duration-300 ease-out-expo"
} ${visible ? "translate-x-0" : "-translate-x-full"}`}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/layout/MobileMenu.tsx
git commit -m "fix: guard slideUp and MobileMenu animations with prefers-reduced-motion"
```

---

## Task 6: Fix ingredient li onClick — add keyboard handler and role

**Files:**
- Modify: `src/components/recipes/RecipePage.tsx:322-340`

The ingredient `<li>` items respond to `onClick` but are not keyboard-accessible. Add `onKeyDown`, `role="button"`, and `tabIndex={0}`.

- [ ] **Step 1: Update the ingredient `<li>` element**

Find the `<li>` element at line 322 and replace it with:

```tsx
<li
  key={recipe.ingredients[i].id}
  onClick={() => {
    const next = new Set(selectedIngredients);
    if (isSelected) next.delete(i);
    else next.add(i);
    setSelectedIngredients(next);
  }}
  onKeyDown={(e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const next = new Set(selectedIngredients);
      if (isSelected) next.delete(i);
      else next.add(i);
      setSelectedIngredients(next);
    }
  }}
  role="button"
  tabIndex={0}
  aria-pressed={isSelected}
  className={`font-serif text-base leading-relaxed flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${
    isSelected ? "bg-gray-50 text-black" : "text-black hover:bg-gray-50"
  }`}
>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recipes/RecipePage.tsx
git commit -m "fix: make ingredient list items keyboard-accessible with role/tabIndex/onKeyDown"
```

---

## Task 7: Fix unlabeled inputs and icon-only button in GroceryList

**Files:**
- Modify: `src/components/grocery/GroceryList.tsx`

- [ ] **Step 1: Add aria-label to text input and Plus button**

Find the input+button block (lines 118–131) and replace it with:

```tsx
<div className="flex gap-2 mb-2">
  <input
    type="text"
    value={newItem}
    onChange={(e) => setNewItem(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && addItem()}
    placeholder="Add an item…"
    aria-label="New grocery item"
    className="flex-1 border border-gray-500 px-4 py-2.5 font-serif text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
  />
  <button
    onClick={addItem}
    aria-label="Add item to grocery list"
    className="bg-black text-white px-4 py-2.5 hover:bg-gray-900 transition-colors"
  >
    <Plus className="w-5 h-5" aria-hidden="true" />
  </button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/grocery/GroceryList.tsx
git commit -m "fix: add aria-label to grocery list input and icon-only Add button"
```

---

## Task 8: Fix unlabeled input and image dimensions in PantrySearch

**Files:**
- Modify: `src/components/pantry/PantrySearch.tsx`

- [ ] **Step 1: Add aria-label to ingredient search input**

Find the `<input>` at line 97 and add `aria-label`:

```tsx
<input
  ref={inputRef}
  type="text"
  value={inputValue}
  onChange={(e) => setInputValue(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder={selectedIngredients.length === 0 ? "Type an ingredient…" : "Add another…"}
  aria-label="Search ingredients"
  className="w-full font-sans text-sm text-black placeholder:text-gray-500 focus:outline-none"
/>
```

- [ ] **Step 2: Fix `<img>` missing width/height in result thumbnails**

Find the `<img>` at line 168 and replace with explicit dimensions:

```tsx
<img
  src={result.recipe.images[0]}
  alt={result.recipe.title}
  width={128}
  height={128}
  loading="lazy"
  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/pantry/PantrySearch.tsx
git commit -m "fix: add aria-label to pantry search input; fix img width/height/loading"
```

---

## Task 9: Fix unlabeled inputs and img dimensions in ImportForm

**Files:**
- Modify: `src/components/recipes/ImportForm.tsx`

- [ ] **Step 1: Add aria-label to image URL input (line 550)**

```tsx
<input
  type="text"
  value={newImageUrl}
  onChange={(e) => setNewImageUrl(e.target.value)}
  placeholder="Paste image URLs (comma or newline separated)…"
  aria-label="Add image URLs"
  className="flex-1 border border-gray-300 px-3 py-2 font-sans text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
/>
```

- [ ] **Step 2: Add aria-label to substitution inputs (lines 631 and 641)**

```tsx
<input
  value={sub.ingredient}
  onChange={(e) => {
    const updated = [...substitutions];
    updated[i] = { ...updated[i], ingredient: e.target.value };
    setSubstitutions(updated);
  }}
  placeholder="Original ingredient"
  aria-label={`Substitution ${i + 1} original ingredient`}
  className="flex-1 border border-gray-300 px-3 py-2 font-serif text-sm text-black focus-visible:outline-none focus-visible:border-black transition-colors"
/>
```

```tsx
<input
  value={sub.substitute}
  onChange={(e) => {
    const updated = [...substitutions];
    updated[i] = { ...updated[i], substitute: e.target.value };
    setSubstitutions(updated);
  }}
  placeholder="Substitute"
  aria-label={`Substitution ${i + 1} replacement`}
  className="flex-1 border border-gray-300 px-3 py-2 font-serif text-sm text-black focus-visible:outline-none focus-visible:border-black transition-colors"
/>
```

- [ ] **Step 3: Fix `<img>` at line 527 — add width/height**

```tsx
<img
  src={src}
  alt={`Recipe image ${i + 1}`}
  width={128}
  height={128}
  className="w-32 h-32 rounded-lg object-cover"
  draggable={false}
/>
```

- [ ] **Step 4: Fix loading text `...` → `…`**

```tsx
// Button loading text (line 379):
{extracting ? "Extracting recipe…" : "Extract from URL"}

// Image extraction button (lines 479–483):
{uploadPhase === "uploading"
  ? "Uploading images…"
  : uploadPhase === "extracting"
  ? "Extracting recipe from image…"
  : "Extract from Image"}

// Polling stage messages (lines 393–397):
{extractionStage === "fetching" && "Fetching page…"}
{extractionStage === "downloading" && "Downloading video…"}
{extractionStage === "transcribing" && "Transcribing video… (this may take a moment)"}
{extractionStage === "extracting" && "Extracting recipe from content…"}
{(!extractionStage || extractionStage === "detecting") && "Starting extraction…"}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/recipes/ImportForm.tsx
git commit -m "fix: label unlabeled inputs; fix img dimensions; fix ellipsis characters in ImportForm"
```

---

## Task 10: Fix unlabeled inputs and img dimensions in EditRecipeForm

**Files:**
- Modify: `src/components/recipes/EditRecipeForm.tsx`

- [ ] **Step 1: Add aria-label to image URL input (line 224)**

```tsx
<input
  type="text"
  value={newImageUrl}
  onChange={(e) => setNewImageUrl(e.target.value)}
  placeholder="Paste image URLs (comma or newline separated)…"
  aria-label="Add image URLs"
  className="flex-1 border border-gray-300 px-3 py-2 font-sans text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
/>
```

- [ ] **Step 2: Fix `<img>` at line 201 — add width/height**

```tsx
<img
  src={src}
  alt={`Recipe image ${i + 1}`}
  width={128}
  height={128}
  className="w-32 h-32 rounded-lg object-cover"
  draggable={false}
/>
```

- [ ] **Step 3: Fix loading/ellipsis strings**

```tsx
// Save button (line ~392):
{saving ? "Saving…" : "Save Changes"}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/recipes/EditRecipeForm.tsx
git commit -m "fix: label unlabeled inputs; fix img dimensions; fix ellipsis in EditRecipeForm"
```

---

## Task 11: Fix thumbnail button aria-labels in ImageLightbox

**Files:**
- Modify: `src/components/recipes/ImageLightbox.tsx:96-107`

- [ ] **Step 1: Add aria-label to each thumbnail button**

```tsx
{images.map((src, i) => (
  <button
    key={i}
    onClick={() => setCurrent(i)}
    aria-label={`View image ${i + 1} of ${images.length}`}
    aria-pressed={i === current}
    className={`shrink-0 w-12 h-12 rounded overflow-hidden transition-opacity relative ${
      i === current ? "opacity-100 ring-2 ring-white" : "opacity-40 hover:opacity-70"
    }`}
  >
    <Image src={src} alt="" fill className="object-cover" sizes="48px" />
  </button>
))}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/recipes/ImageLightbox.tsx
git commit -m "fix: add aria-label and aria-pressed to ImageLightbox thumbnail buttons"
```

---

## Task 12: URL-sync filter state in FilterBar

**Files:**
- Modify: `src/components/recipes/FilterBar.tsx`
- Modify: `src/app/recipes/page.tsx`

This is the most structural change. FilterBar will read its initial state from `useSearchParams` and update the URL when filters change, so filters survive navigation and can be bookmarked/shared.

**Approach:** Replace internal `useState` for each filter with URL param reads. On toggle, push a new URL with `router.replace`. The `onFilter` callback remains for the parent to know the filtered result set.

URL param names: `q` (search), `meal` (comma-separated meal types), `cuisine`, `diet`, `cookTime`, `nutrition`, `favs=1`.

- [ ] **Step 1: Add useSearchParams and useRouter to FilterBar; read initial state from URL**

At the top of `FilterBar`, replace the existing `useState` declarations for `search`, `selectedMealTypes`, `selectedCuisines`, `selectedDietary`, `showFavorites`, `cookTimeRange`, `nutritionFilter` with URL-driven state:

```tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Tag from "@/components/ui/Tag";
import type { RecipeCardData } from "@/types";

// ... MEAL_TYPES, CUISINES, DIETARY constants unchanged ...

interface FilterBarProps {
  recipes: RecipeCardData[];
  onFilter: (filtered: RecipeCardData[]) => void;
}

export default function FilterBar({ recipes, onFilter }: FilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive filter state from URL
  const search = searchParams.get("q") ?? "";
  const selectedMealTypes = useMemo(
    () => new Set(searchParams.get("meal")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const selectedCuisines = useMemo(
    () => new Set(searchParams.get("cuisine")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const selectedDietary = useMemo(
    () => new Set(searchParams.get("diet")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const showFavorites = searchParams.get("favs") === "1";
  const cookTimeRange = searchParams.get("cookTime") ?? null;
  const nutritionFilter = searchParams.get("nutrition") ?? null;

  const [filtersOpen, setFiltersOpen] = useState(false);
```

- [ ] **Step 2: Replace the `setSearch`, `setSelectedMealTypes`, etc. setters with a `updateParams` helper**

Add after the state declarations:

```tsx
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );
```

- [ ] **Step 3: Replace filter setter functions with URL-update versions**

```tsx
  function handleSearch(value: string) {
    updateParams({ q: value || null });
  }

  function handleFavorites() {
    updateParams({ favs: showFavorites ? null : "1" });
  }

  function handleCookTime(range: string) {
    updateParams({ cookTime: cookTimeRange === range ? null : range });
  }

  function handleNutrition(value: string) {
    updateParams({ nutrition: nutritionFilter === value ? null : value });
  }

  function toggleMealType(value: string) {
    const next = new Set(selectedMealTypes);
    if (next.has(value)) next.delete(value); else next.add(value);
    updateParams({ meal: next.size > 0 ? Array.from(next).join(",") : null });
  }

  function toggleCuisine(value: string) {
    const next = new Set(selectedCuisines);
    if (next.has(value)) next.delete(value); else next.add(value);
    updateParams({ cuisine: next.size > 0 ? Array.from(next).join(",") : null });
  }

  function toggleDietary(value: string) {
    const next = new Set(selectedDietary);
    if (next.has(value)) next.delete(value); else next.add(value);
    updateParams({ diet: next.size > 0 ? Array.from(next).join(",") : null });
  }

  function clearAll() {
    router.replace(pathname, { scroll: false });
  }
```

- [ ] **Step 4: Apply filtering whenever URL params change**

Replace the `applyFilters` approach with a `useEffect` that re-runs whenever the URL params or recipes change:

```tsx
  useEffect(() => {
    const filtered = recipes.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesTags = r.tags.some((t) => t.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTags) return false;
      }
      if (showFavorites && !r.isFavorite) return false;
      if (selectedMealTypes.size > 0) {
        if (!r.tags.some((t) => t.type === "MEAL_TYPE" && selectedMealTypes.has(t.name))) return false;
      }
      if (selectedCuisines.size > 0) {
        if (!r.tags.some((t) => t.type === "CUISINE" && selectedCuisines.has(t.name))) return false;
      }
      if (selectedDietary.size > 0) {
        if (!r.tags.some((t) => t.type === "DIETARY" && selectedDietary.has(t.name))) return false;
      }
      if (cookTimeRange) {
        const ct = r.cookTime;
        if (ct === null) return false;
        if (cookTimeRange === "under30" && ct > 30) return false;
        if (cookTimeRange === "30to60" && (ct < 30 || ct > 60)) return false;
        if (cookTimeRange === "60to120" && (ct < 60 || ct > 120)) return false;
        if (cookTimeRange === "over120" && ct < 120) return false;
      }
      if (nutritionFilter) {
        const n = r.nutrition;
        if (!n || n.calories === null) return false;
        if (nutritionFilter === "under300" && n.calories > 300) return false;
        if (nutritionFilter === "300to500" && (n.calories < 300 || n.calories > 500)) return false;
        if (nutritionFilter === "500to700" && (n.calories < 500 || n.calories > 700)) return false;
        if (nutritionFilter === "over700" && n.calories < 700) return false;
        if (nutritionFilter === "highProtein" && (n.protein === null || n.protein < 25)) return false;
        if (nutritionFilter === "lowCarb" && (n.carbs === null || n.carbs > 20)) return false;
        if (nutritionFilter === "lowCalorie" && n.calories > 400) return false;
      }
      return true;
    });
    onFilter(filtered);
  }, [recipes, search, showFavorites, selectedMealTypes, selectedCuisines, selectedDietary, cookTimeRange, nutritionFilter, onFilter]);
```

- [ ] **Step 5: Update the JSX to use the new handler names**

In the JSX, replace calls like `toggle(selectedMealTypes, setSelectedMealTypes, m)` with `toggleMealType(m)`, similarly for cuisine/dietary. Replace `handleSearch` calls in the `<input>` onChange — they stay the same name. The search `<input>` value uses the URL-derived `search` directly.

Key JSX diffs:
- Search input: `onChange={(e) => handleSearch(e.target.value)}` — unchanged
- Meal type tags: `onClick={() => toggleMealType(m)}` 
- Cuisine tags: `onClick={() => toggleCuisine(c)}`
- Dietary tags: `onClick={() => toggleDietary(d)}`
- Active filter summary tags use the same handlers

Remove the old `toggle`, `applyFilters`, and all `set*` state setters — they are replaced by `updateParams` calls.

- [ ] **Step 6: Wrap FilterBar usage in Suspense in the recipes page**

`useSearchParams()` requires a Suspense boundary in Next.js App Router. Open `src/app/recipes/page.tsx` and wrap the `<RecipeCollection>` (which renders `<FilterBar>`) in a `<Suspense>`:

```tsx
import { Suspense } from "react";

// Inside the page JSX, wrap the collection:
<Suspense fallback={<div className="py-8 text-center font-sans text-sm text-gray-600">Loading…</div>}>
  <RecipeCollection recipes={recipes} />
</Suspense>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/recipes/FilterBar.tsx src/app/recipes/page.tsx
git commit -m "feat: sync recipe filter/search state to URL for deep-linking and back-button support"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Zoom disable removed (Task 1)
- ✅ Input label/id linking (Tasks 2, 3, 4)
- ✅ Autocomplete/name/spellCheck on auth forms (Tasks 3, 4)
- ✅ focus-visible instead of focus (Tasks 2, 3, 4)
- ✅ Reduced-motion for slideUp and MobileMenu (Task 5)
- ✅ `<li onClick>` keyboard handler (Task 6)
- ✅ Unlabeled inputs + icon-only button in GroceryList (Task 7)
- ✅ Unlabeled input + img dimensions in PantrySearch (Task 8)
- ✅ Unlabeled inputs + img dimensions + ellipsis in ImportForm (Task 9)
- ✅ Unlabeled input + img dimensions + ellipsis in EditRecipeForm (Task 10)
- ✅ ImageLightbox thumbnail button aria-labels (Task 11)
- ✅ Filter URL sync (Task 12)

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:** `updateParams` signature `Record<string, string | null>` is consistent throughout Task 12. `toggleMealType`/`toggleCuisine`/`toggleDietary` signatures align with Tag `onClick` usage.

**Gaps:** 
- `RecipePage.tsx:246` — the `<div>` around FavoriteButton with hover styles is a cosmetic issue (not a `div onClick` anti-pattern since FavoriteButton renders the interactive button). No fix needed.
- `FilterBar.tsx` Filters button icon (`SlidersHorizontal`) — has text "Filters" so no aria-label needed.
- `CookingMode.tsx` Read/Guided buttons — have visible text labels; acceptable.

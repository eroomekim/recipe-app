# Recipe Book — Additional Features Design

> Five features that differentiate the Recipe Book through practical cooking UX and editorial curation. No social/community features — this is a personal, image-forward food journal.

---

## Design Philosophy

Two distinct modes of engagement with the same recipe data:

1. **Editorial browsing** — image-forward, story-driven, inspirational. The New Yorker aesthetic isn't just decoration — it elevates personal stories and food photography to feel worthy of being told.
2. **Practical cooking** — functional, hands-free, distraction-free. When you're in the kitchen with messy hands, the app gets out of your way and helps you cook.

The app captures not just recipes, but the **knowledge** around them (substitutions, storage tips, techniques) and the **personal meaning** attached to them (stories, adaptations, memories). Food is love, and love carries stories — even a found recipe becomes your family's story over generations.

---

## Implementation Order

Foundation-first approach — data model changes land first, everything else builds on richer data.

1. Rich Recipe Extraction (data foundation)
2. Image-Forward Booklet (visual foundation)
3. Personal Stories & Favorites
4. Smart Collections & AI Curation
5. Cooking Mode

---

## Feature 1: Rich Recipe Extraction

### Problem

The current scraper extracts title, ingredients, instructions, and images — but food blogs contain valuable supplementary content (substitutions, storage tips, make-ahead notes, technique explanations) that gets thrown away.

### Solution

Expand the Cheerio + JSON-LD scraper to extract structured supplementary content from recipe pages.

### Data Model Changes

New fields on `Recipe`:

| Field | Type | Description |
|-------|------|-------------|
| `servings` | `Int?` | Number of servings (needed for scaling) |
| `storageTips` | `String?` | How to store leftovers |
| `makeAheadNotes` | `String?` | Make-ahead / prep-ahead instructions |
| `servingSuggestions` | `String?` | What to serve with the dish |
| `techniqueNotes` | `String?` | Chef tips, "why this works" explanations |

New model `Substitution`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `recipeId` | `String` | FK to Recipe (`onDelete: Cascade`) |
| `ingredient` | `String` | Original ingredient |
| `substitute` | `String` | Replacement ingredient |
| `notes` | `String?` | Additional context (e.g., "let sit 5 min") |
| `order` | `Int` | Display order |

New structured fields on `Ingredient` (for scaling support):

| Field | Type | Description |
|-------|------|-------------|
| `quantity` | `Float?` | Numeric amount (e.g., 1.5) — null for "salt to taste" |
| `unit` | `String?` | Unit of measure (e.g., "cup", "tbsp") — null for count items ("2 eggs") |
| `name` | `String?` | Ingredient name without quantity/unit (e.g., "flour") |

The existing `text` field is retained as the canonical display string. The structured fields are best-effort parsed during extraction and enable scaling math. When structured fields are present, scaling adjusts `quantity` and regenerates display text. When absent, the ingredient displays as-is and cannot be scaled. Known limitations: items like "1 large egg" or "a pinch of salt" may not parse cleanly — these display unscaled with a visual indicator.

### Extraction Strategy

- **JSON-LD:** `schema.org/Recipe` includes `recipeYield` (servings). Add `recipeYield` to the `SchemaRecipe` interface in `scraper.ts` and parse to integer (e.g., "4 servings" → 4, "12 cookies" → 12). Extract ingredient structured fields by parsing each ingredient string into quantity/unit/name using regex patterns (e.g., `"1 1/2 cups flour"` → `{quantity: 1.5, unit: "cup", name: "flour"}`).
- **HTML patterns:** Most food blogs (WPRM, Tasty Recipes) put substitutions and tips in a "Recipe Notes" section below the recipe card. Target common selectors:
  - `.wprm-recipe-notes`, `.tasty-recipe-notes`
  - Headings containing "substitution", "storage", "make ahead", "tips", "notes"
  - `itemprop="recipeNotes"`
- **Fallback:** If no structured notes are found, the fields remain null. Users can add them manually.

### API Changes

`POST /api/extract` response adds:

```json
{
  "...existing fields...",
  "servings": 4,
  "substitutions": [
    { "ingredient": "buttermilk", "substitute": "milk + 1 tbsp lemon juice", "notes": "let sit 5 min" }
  ],
  "storageTips": "Refrigerate up to 4 days...",
  "makeAheadNotes": "Can be assembled 1 day ahead...",
  "servingSuggestions": "Serve over polenta or mashed potatoes",
  "techniqueNotes": "Searing at high heat develops the fond..."
}
```

### Import Form Changes

The review/edit form on `/import` adds collapsible sections below the existing fields:

- Servings input (number)
- Substitutions (add/remove rows: ingredient → substitute → notes)
- Storage tips (textarea)
- Make-ahead notes (textarea)
- Serving suggestions (textarea)
- Technique notes (textarea)

All pre-populated from extraction, fully editable.

---

## Feature 2: Image-Forward Booklet Redesign

### Problem

The current booklet view treats images as secondary to text. The browsing experience should feel like flipping through a food magazine — photography drives inspiration.

### Design Changes

**Hero image:**
- Full-bleed, edge-to-edge, no padding
- 60–70vh on desktop, 50vh on mobile
- Dark gradient overlay at the bottom (transparent → rgba(0,0,0,0.75))

**Title on image:**
- Recipe title and rubric label sit on top of the hero image, inside the gradient
- White text, display serif, `text-5xl` (55px) desktop / `text-2xl` (28px) mobile — uses existing design system tokens
- Text shadow for legibility: `0 1px 4px rgba(0,0,0,0.3)`
- Rubric label in white at slight opacity above the title

**Scroll to reveal:**
- Recipe details (tags, story, ingredients, instructions, notes) live below the hero
- Initial view is almost entirely image + title
- Scrolling within the booklet card reveals content

**Image carousel:**
- Carousel dots are larger, positioned over the hero image
- Swiping through images feels like a photo spread
- Additional images can be interspersed between content sections

**Content order (below hero):**
1. Tag pills row + "View Original →" link
2. Personal story block (if present) — italic serif, left border callout
3. Divider
4. Two-column ingredients/instructions (desktop) or stacked (mobile)
5. Divider
6. Substitutions section
7. Storage tips / make-ahead / serving suggestions
8. Previous / Next navigation

**Typography adjustments:**
- Title on hero: white, display serif, `font-weight: 900`, `line-height: 1.0`
- Rubric on hero: white, `opacity: 0.7`, display serif 12px
- Personal story: italic serif, `color: gray-600`, left border `2px solid gray-200`
- Supplementary sections (substitutions, storage): `font-size: 13px`, `color: gray-600`

---

## Feature 3: Personal Stories & Favorites

### Problem

A recipe from a blog becomes something personal over time — family traditions, adaptations, memories. The app should capture and elevate these stories as first-class content, not metadata.

### Data Model Changes

New fields on `Recipe`:

| Field | Type | Description |
|-------|------|-------------|
| `personalNotes` | `String?` | Freeform narrative — memories, stories, emotional connection |
| `personalAdaptations` | `String?` | Specific changes to the original recipe |
| `isFavorite` | `Boolean` | Default false |

### Personal Notes UX

- Two editable text fields accessible from the booklet view:
  - **"Our Story"** — freeform narrative text
  - **"My Adaptations"** — specific tweaks to the original
- Inline editing: tap edit icon → text becomes editable → save in place. No modal.
- Empty state: faint italic prompt *"Add your story..."* — inviting, not nagging
- Display: editorial callout style in the booklet view (italic serif, left border), positioned after the tag pills row and before the ingredients/instructions — the most prominent content position after the hero image

### Favorites

- Heart/bookmark icon on recipe cards (grid view) and in booklet view
- Toggle on tap, no confirmation needed
- Filterable via FilterBar ("Favorites" toggle pill)
- Favorites get higher weight in AI-curated collections

---

## Feature 4: Smart Collections & AI Curation

### Problem

As a collection grows, recipes get forgotten. The app should help users rediscover and explore their own recipes through editorially framed groupings.

### Data Model Changes

New model `Collection`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` | Primary key (cuid) |
| `userId` | `String` | FK to User |
| `name` | `String` | Collection name ("Thanksgiving", "Date Night") |
| `description` | `String?` | Optional description |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | `@updatedAt` |

New join table `RecipeCollection`:

| Field | Type | Description |
|-------|------|-------------|
| `recipeId` | `String` | FK to Recipe |
| `collectionId` | `String` | FK to Collection |

New field on `Recipe`:

| Field | Type | Description |
|-------|------|-------------|
| `lastViewedAt` | `DateTime?` | For rediscovery logic. Updated when recipe is opened in the booklet view (not on API list queries). |

### Smart Collections (Rule-Based + AI)

Smart collections are computed server-side and **not** persisted to the `Collection` table — they are generated on page load for `/recipes` based on the user's current recipe data. They are recalculated on each request (lightweight DB queries, no caching needed at this scale).

**Rule-based collections** (no AI, pure DB queries):
- **Quick filters** — "Weeknight Dinners Under 30 Minutes", "5 Ingredients or Fewer" — computed from cook time and ingredient count
- **Rediscovery** — "Haven't Made in a While" — recipes where `lastViewedAt` is older than 30 days (or null)
- **Favorites** — recipes where `isFavorite` is true

**AI-curated collections** (LLM API call, cached per user per day):
- **Seasonal** — "Spring Vegetables", "Summer Grilling", "Fall Comfort Food", "Holiday Baking" — AI analyzes recipe ingredients and tags against current season to suggest groupings
- **Featured** — AI selects a single recipe highlight based on season, variety, and recency. Large image, display serif title, magazine cover framing. Refreshed daily.

AI-curated results are cached in a `SmartCollectionCache` table (`userId`, `type`, `recipeIds JSON`, `generatedAt`) and refreshed when older than 24 hours. If the AI API is unavailable, these sections simply don't appear — rule-based collections always work.

### User-Created Collections

- Create named collections from the recipes page
- Add recipes to collections from the booklet view ("Add to Collection" action)
- A recipe can belong to multiple collections
- Collections are browsable as their own section/filter on the recipes page

### UI Placement

On `/recipes`, above the recipe grid:
- Horizontal scrollable section showing AI-generated and user-created collections as named groups
- Each collection shows a preview (2-3 recipe images tiled) and the collection name
- Tapping a collection filters the grid/booklet to that subset

### Scope Boundaries

No social sharing, collaborative collections, or public/private visibility. Purely personal curation.

---

## Feature 5: Cooking Mode

### Problem

Using a recipe app while actually cooking is frustrating — screens dim, text is too small, navigating between ingredients and instructions requires clean hands you don't have.

### Entry Point

"Start Cooking" button in the booklet view. Full-screen takeover.

### Default Mode (Simple)

Designed for experienced home cooks who just need a reference.

- **Wake lock** keeps screen on (Screen Wake Lock API)
- **Dark background, light text** — high contrast for kitchen readability, reduces glare
- **One step at a time** — current instruction centered on screen in large text (24px+ mobile)
- **Ingredient drawer** — collapsible panel at bottom showing full ingredient list
- **Large tap zones** — left half of screen = previous step, right half = next step. Visible arrow buttons as fallback.
- **Step indicator** — "Step 3 of 8" at top
- **Scaling control** — adjust servings at the top. All ingredient quantities recalculate with smart math:
  - Handles fractions (1/3 → 2/3 when doubling)
  - Rounds sensibly (avoid "1.333 cups")
  - Knows common packaging (doesn't say "1.5 eggs")
- **Exit** — X button or swipe down

### Guided Mode

Toggle on from within cooking mode. Adds features for less experienced cooks.

- **Voice commands** via Web Speech API: "next step", "previous step", "repeat", "ingredients". Graceful degradation: if Speech API is unavailable (e.g., Firefox), voice commands are hidden and Guided Mode offers only timers, checklist, and read-aloud features.
- **Built-in timers** — when a step mentions a time ("cook 15 minutes"), a timer button appears inline. Tap to start. Timer runs as overlay/toast with audible alert.
- **Ingredient checklist** — tap ingredients to check them off as you prep
- **Step read-aloud** — option to have each step spoken when navigated to (Web Speech Synthesis API)

### What This Doesn't Include

- Recipe video or camera integration
- Additional hardware API usage
- Meal prep coordination across multiple recipes

---

## Summary of All Data Model Changes

### New fields on `Recipe`:

```
servings            Int?
storageTips         String?
makeAheadNotes      String?
servingSuggestions   String?
techniqueNotes       String?
personalNotes        String?
personalAdaptations  String?
isFavorite           Boolean   @default(false)
lastViewedAt         DateTime?
```

### New fields on `Ingredient`:

```
quantity    Float?    — numeric amount (null for "salt to taste")
unit        String?   — unit of measure (null for count items like "2 eggs")
name        String?   — ingredient name without quantity/unit
```

Existing `text` field retained as canonical display string.

### New models:

```
Substitution (id, recipeId, ingredient, substitute, notes, order)
  — recipeId FK with onDelete: Cascade

Collection (id, userId, name, description, createdAt, updatedAt)
  — userId FK with onDelete: Cascade

RecipeCollection (recipeId, collectionId) — join table

SmartCollectionCache (userId, type, recipeIds JSON, generatedAt)
  — caches AI-curated collections, refreshed every 24 hours
```

### TypeScript type changes:

- `ExtractedRecipe` — add servings, substitutions[], storageTips, makeAheadNotes, servingSuggestions, techniqueNotes
- `CreateRecipeRequest` — add all new Recipe fields + substitutions
- `RecipeDetail` — add all new Recipe fields + substitutions relation
- `SchemaRecipe` — add `recipeYield` field

### Extraction API response additions:

```
servings, substitutions[], storageTips, makeAheadNotes,
servingSuggestions, techniqueNotes
```

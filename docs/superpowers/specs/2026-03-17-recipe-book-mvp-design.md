# Recipe Book — MVP Design Spec

> Phases 1–2: Foundation + Core Recipe Features

## Overview

A mobile-first, editorial-style recipe collection app inspired by The New Yorker's design language. Users paste food blog URLs, AI extracts the recipe, and it's saved to a personal collection. The MVP covers project setup, the design system, authentication, AI-powered recipe import, and a grid-based recipe collection view.

## Key Decisions (Deviations from PRD)

| Decision | PRD Original | MVP Approach |
|----------|-------------|--------------|
| Database | PostgreSQL (generic) | Supabase (hosted Postgres) |
| Auth | NextAuth.js + credentials + Google OAuth | Supabase Auth (email/password + Google OAuth) |
| Image Storage | Store source blog URLs only | Download & store in Supabase Storage |
| AI Extraction | Flexible (fetch via AI) | Cheerio scrape → pass HTML to Anthropic API |
| Scope | Phases 1–5 | Phases 1–2 (MVP) |

## Deferred to Post-MVP

- Booklet browser (page-flip view with prev/next navigation)
- Search & filter bar (meal type, cuisine, dietary, cook time)
- Recipe edit (PUT endpoint)
- Image carousel with dots
- Swipe gestures / keyboard navigation
- Loading skeletons
- Rate limiting (Redis-based)
- Settings page

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3.4+ |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma |
| Auth | Supabase Auth (email/password + Google OAuth) |
| AI | Anthropic API (Claude) |
| Scraping | Cheerio |
| Image Storage | Supabase Storage |
| Deployment | Vercel |
| Package Manager | pnpm |

## 2. Database Schema

### Prisma Models

```prisma
model User {
  id        String   @id                    // Supabase auth.users UUID
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  recipes   Recipe[]
}

model Recipe {
  id           String        @id @default(cuid())
  userId       String
  title        String
  sourceUrl    String?
  cookTime     Int?          // Minutes
  images       String[]      // Supabase Storage URLs
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  ingredients  Ingredient[]
  instructions Instruction[]
  tags         RecipeTag[]

  @@index([userId])
  @@index([createdAt])
}

model Ingredient {
  id       String @id @default(cuid())
  recipeId String
  text     String
  order    Int
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  @@index([recipeId])
}

model Instruction {
  id       String @id @default(cuid())
  recipeId String
  text     String
  order    Int
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  @@index([recipeId])
}

model Tag {
  id      String      @id @default(cuid())
  name    String
  type    TagType
  recipes RecipeTag[]
  @@unique([name, type])
}

model RecipeTag {
  recipeId String
  tagId    String
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([recipeId, tagId])
}

enum TagType {
  MEAL_TYPE
  CUISINE
  DIETARY
}
```

### Seed Data

```
Meal Types: Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer
Cuisines: Italian, Mexican, Thai, Japanese, Indian, French, American, Mediterranean, Chinese, Korean, Vietnamese, Middle Eastern, Greek, Other
Dietary: Vegan, Vegetarian, Gluten-Free, Dairy-Free, Keto, Paleo, Nut-Free, Low-Carb
```

## 3. Authentication

### Approach: Supabase Auth

- `@supabase/supabase-js` + `@supabase/ssr` for Next.js integration
- Two Supabase clients: browser client (client components) and server client (API routes / server components)
- Google OAuth configured in Supabase dashboard

### Route Protection

- Next.js middleware checks for valid Supabase session on protected routes (`/recipes`, `/import`, `/settings`)
- Unauthenticated users redirected to `/login`
- Public routes: `/`, `/login`, `/signup`

### User Sync

- On first authenticated API call, check if a `User` row exists in Prisma for the Supabase `auth.users` UUID
- If not, create it (id + email from the Supabase session)
- No database triggers needed

### Pages

- `/login` — email/password + "Sign in with Google" button
- `/signup` — email/password registration + "Sign up with Google" button
- Styled to match the design system (minimal, typography-first)

## 4. AI Recipe Extraction Pipeline

### Flow

1. User pastes URL on `/import`
2. Client sends `POST /api/extract` with `{ url }`
3. Server validates URL format
4. Server fetches the page with `fetch()`
5. Cheerio parses HTML — extracts `<body>`, strips `<script>`, `<style>`, `<nav>`, `<footer>`, ads. Collects all `<img>` tags with `src` and `alt` attributes
6. Cleaned HTML + image list sent to Anthropic API with structured prompt requesting JSON: title, ingredients, instructions, relevant image URLs (2–8, food/step images only), suggested tags, cook time
7. AI response parsed and validated against expected JSON shape
8. Result returned to client for review

### Image Handling

Images are downloaded and uploaded to Supabase Storage at **save time**, not extraction time. During the review step, original blog image URLs are shown as previews. On save:

- Each image downloaded server-side
- Uploaded to Supabase Storage at `recipes/{userId}/{recipeId}/{filename}`
- Supabase Storage public URLs stored in `Recipe.images` array

### Error Handling

- URL unreachable → clear error message to user
- AI extraction fails or malformed JSON → retry once, then show error with manual entry fallback
- Image download fails → skip that image, continue with the rest

### Rate Limiting (MVP)

Simple in-memory counter: 20 extractions per user per day. Resets on server restart. Upgrade to Redis post-MVP.

## 5. API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/extract` | POST | Required | Scrape URL → Anthropic API → return structured recipe JSON |
| `/api/recipes` | GET | Required | List all recipes for authenticated user |
| `/api/recipes` | POST | Required | Create recipe (download images → upload to storage → save) |
| `/api/recipes/[id]` | GET | Required | Get single recipe with ingredients, instructions, tags |
| `/api/recipes/[id]` | DELETE | Required | Delete recipe, verify ownership, clean up storage images |

All routes verify Supabase session via server client. Recipe mutation routes verify `recipe.userId === session.user.id`.

### POST /api/extract

**Request:** `{ "url": "https://example.com/recipe" }`

**Response:**
```json
{
  "title": "Recipe Title",
  "ingredients": ["1 cup flour", "2 eggs"],
  "instructions": ["Preheat oven to 350°F", "Mix dry ingredients"],
  "images": ["https://blog.com/photo1.jpg", "https://blog.com/photo2.jpg"],
  "suggestedMealTypes": ["Dinner"],
  "suggestedCuisines": ["Italian"],
  "suggestedDietary": ["Vegetarian"],
  "suggestedCookTimeMinutes": 45
}
```

### POST /api/recipes

**Request:** Full recipe data from the review/edit form, including original image URLs to download.

**Process:** Download images → upload to Supabase Storage → create Recipe + Ingredients + Instructions + RecipeTags in a transaction → return created recipe.

### GET /api/recipes

**Response:** Array of recipes with tags, ingredients count, instructions count. Ordered by `createdAt` desc. No pagination in MVP.

## 6. Pages & Components

### Project Structure (MVP subset)

```
src/
├── app/
│   ├── layout.tsx              # Root layout with fonts, nav
│   ├── page.tsx                # Landing / redirect to /recipes
│   ├── globals.css             # Tailwind directives + base styles
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── recipes/
│   │   ├── page.tsx            # Collection view (grid)
│   │   └── [id]/page.tsx       # Single recipe detail
│   ├── import/
│   │   └── page.tsx            # Import flow
│   └── api/
│       ├── extract/route.ts
│       └── recipes/
│           ├── route.ts        # GET, POST
│           └── [id]/route.ts   # GET, DELETE
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Tag.tsx
│   │   ├── TagSelector.tsx
│   │   ├── Spinner.tsx
│   │   └── Divider.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── MobileMenu.tsx
│   ├── recipes/
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeGrid.tsx
│   │   └── ImportForm.tsx
│   └── auth/
│       ├── LoginForm.tsx
│       └── SignupForm.tsx
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── middleware.ts       # Auth middleware helper
│   ├── ai.ts                   # Scraping + Anthropic extraction logic
│   ├── storage.ts              # Supabase Storage upload helpers
│   └── utils.ts
├── hooks/
│   └── useRecipes.ts
└── types/
    └── index.ts
```

### Root Layout

- Google Fonts via `next/font`: Playfair Display (display), Libre Baskerville (serif), Inter (sans)
- CSS variables applied to `<body>`
- `<Navbar />` rendered (sticky)
- No footer

### Navbar

- **Desktop (md+):** Left: "Recipe Book" in display serif. Center: "RECIPES", "IMPORT" in bold uppercase sans. Right: user email/initial + sign out
- **Mobile:** Left: hamburger. Center: "Recipe Book". Right: user initial. Hamburger opens slide-out menu

### Recipe Collection Page (`/recipes`)

- Recipe count: "12 Recipes" in metadata style
- `<RecipeGrid />` — 1 col mobile, 2 col tablet, 3 col desktop
- Empty state: centered "Your recipe book is empty" + "Import First Recipe" button

### RecipeCard

- Hero image, 3:2 aspect ratio
- Red rubric label (first meal type tag)
- Display serif title
- Italic serif subtitle (truncated first instruction)
- "X ingredients · Y steps" metadata
- Hover: image scale(1.03), title opacity shift
- Click: navigate to `/recipes/[id]`
- No border, no shadow, no rounded corners

### Single Recipe Page (`/recipes/[id]`)

- Hero image full-width
- 1px rule divider
- Tag row: meal type · cuisine · cook time
- Title in display serif 38px (desktop) / 28px (mobile)
- "View Original →" link in red
- 1px rule divider
- Two-column layout (desktop): ingredients left, instructions right
- Single column stacked (mobile): ingredients then instructions
- Additional images as thumbnail grid at bottom

### Import Page (`/import`)

**Step 1 — URL Input:**
- Centered, max-width 700px
- Display serif heading: "Import a Recipe"
- URL text input with placeholder
- "Extract Recipe" primary button
- Loading: button disabled, spinner + "Extracting recipe..."

**Step 2 — Review & Edit:**
- Replaces step 1 content (no modal)
- Image thumbnail row with X to remove
- Title input (pre-populated)
- Ingredients textarea, one per line (pre-populated)
- Instructions textarea, one per line (pre-populated)
- Cook time number input
- Three tag selector rows: Meal Type, Cuisine, Dietary (toggle pills, AI suggestions pre-selected)
- "Save to Recipe Book" primary button
- "Back" secondary button
- On save: redirect to `/recipes`

### Login / Signup Pages

- Centered card layout, max-width 400px
- Display serif heading
- Email + password inputs
- Primary action button
- "Sign in with Google" secondary button with Google icon
- Link to alternate page ("Don't have an account? Sign up")

## 7. Design System

The full design system from the PRD applies unchanged. Key elements for implementation:

- **Fonts:** Playfair Display (display), Libre Baskerville (body), Inter (UI)
- **Colors:** Black, white, grays, single red accent (#DF3331) for rubric labels only
- **No shadows, no gradients, no rounded corners on content**
- **1px rules in gray-300 for dividers**
- **Buttons:** Primary = black bg / white text. Secondary = white bg / black border
- **Tag pills:** Inactive = gray-50 bg / gray-600 text. Active = black bg / white text
- **Typography:** Headlines at 1:1 line-height, body at 140-150%, nav always bold uppercase sans

The full Tailwind config from the PRD (Section 5.7) should be used as-is.

## 8. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Supabase connection string)
DATABASE_URL=

# AI
ANTHROPIC_API_KEY=

# Optional
RATE_LIMIT_DAILY=20
```

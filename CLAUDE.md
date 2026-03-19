# Recipe Book — Product Requirements Document

> A mobile-first, editorial-style recipe collection app inspired by The New Yorker's design language. Built with Next.js, Tailwind CSS, PostgreSQL + Prisma, and server-side recipe extraction.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Stories](#2-user-stories)
3. [Information Architecture](#3-information-architecture)
4. [Feature Specifications](#4-feature-specifications)
5. [Design System](#5-design-system)
6. [Technical Architecture](#6-technical-architecture)
7. [Database Schema](#7-database-schema)
8. [API Routes](#8-api-routes)
9. [Page & Component Structure](#9-page--component-structure)
10. [Authentication](#10-authentication)
11. [Deployment & Environment](#11-deployment--environment)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Product Overview

### Vision

A personal recipe book that imports recipes from food blogs via URL, automatically extracting titles, ingredients, instructions, and 2–8 images using server-side scraping of structured recipe data (JSON-LD / schema.org). Recipes are categorized and tagged for filtering. The browsing experience is a card/page-flip booklet — one recipe at a time — with an editorial design aesthetic mirroring The New Yorker's typography-first, restrained visual language.

### Core Value Proposition

- **Paste a URL** → server-side scraper extracts the recipe, images, and suggests tags
- **Review and edit** before saving to your personal collection
- **Browse like a booklet** — flip through recipes one at a time
- **Search and filter** by meal type, cuisine, dietary tags, and cook time
- **Cloud sync** — recipes persist across devices via authenticated user accounts

### Target Users

- Home cooks who collect recipes from blogs
- Users who want a clean, distraction-free reading experience for recipes
- People who value design quality and editorial aesthetics

---

## 2. User Stories

### Authentication

- As a user, I can sign up with email/password or SSO (Google, GitHub)
- As a user, I can log in and access my recipe collection from any device
- As a user, I can log out and my data remains secure

### Recipe Import

- As a user, I can paste a food blog URL and have the recipe auto-extracted
- As a user, I can review the extracted title, ingredients, instructions, and images before saving
- As a user, I can edit any extracted field before saving
- As a user, I can remove unwanted images from the extraction
- As a user, I can add/change the meal type, cuisine, dietary tags, and cook time before saving

### Recipe Browsing

- As a user, I see my recipes in a page-flip booklet view (one recipe at a time)
- As a user, I can navigate between recipes with left/right arrows or swipe gestures
- As a user, I can see a recipe's hero image, title, tags, ingredients, instructions, and additional images
- As a user, I can tap "View Original" to open the source blog post

### Search & Filtering

- As a user, I can search recipes by title, ingredient, or tag keyword
- As a user, I can filter by meal type (Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer)
- As a user, I can filter by cuisine (Italian, Mexican, Thai, Japanese, Indian, French, etc.)
- As a user, I can filter by dietary restriction (Vegan, Vegetarian, Gluten-Free, Dairy-Free, Keto, Paleo, etc.)
- As a user, I can filter by cook time ranges
- As a user, I can combine multiple filters
- As a user, I can clear all filters with one action

### Recipe Management

- As a user, I can delete a recipe from my collection
- As a user, I can edit a saved recipe's details
- As a user, I can see how many recipes I have collected

---

## 3. Information Architecture

```
/                       → Landing page (unauthenticated) or Recipe collection (authenticated)
/login                  → Login page
/signup                 → Registration page
/recipes                → Recipe collection — booklet browser with search/filters
/recipes/[id]           → Single recipe deep link (shareable)
/import                 → Import flow (URL input → extraction → review → save)
/settings               → Account settings
```

---

## 4. Feature Specifications

### 4.1 Recipe Extraction (Server-Side Scraping)

**Input:** A URL to a food blog recipe page.

**Process:**
1. User pastes URL into import form
2. Server-side API route receives URL
3. Server fetches the page with `fetch()`
4. Cheerio parses HTML and extracts recipe data via two strategies:
   - **Primary: JSON-LD parsing** — extracts `schema.org/Recipe` structured data from `<script type="application/ld+json">` tags (handles direct objects, arrays, and `@graph` patterns from Yoast SEO / WP Recipe Maker)
   - **Fallback: HTML pattern matching** — uses common recipe card selectors (WPRM, Tasty Recipes, `itemprop` microdata) when no JSON-LD is present
5. Maps extracted fields to `ExtractedRecipe` shape: title, ingredients, instructions, 2–8 images (filtering out logos/icons/tracking pixels), suggested tags (meal type, cuisine, dietary), and cook time (parsed from ISO 8601 durations)
6. Return structured JSON to client
7. Client renders review/edit form pre-populated with extracted data

**Output JSON shape:**
```json
{
  "title": "Recipe Title",
  "ingredients": ["1 cup flour", "2 eggs", "..."],
  "instructions": ["Preheat oven to 350°F", "Mix dry ingredients", "..."],
  "images": ["https://...", "https://...", "..."],
  "suggestedMealTypes": ["Dinner"],
  "suggestedCuisines": ["Italian"],
  "suggestedDietary": ["Vegetarian"],
  "suggestedCookTimeMinutes": 45,
  "_meta": { "method": "json-ld" }
}
```

**Error handling:**
- If extraction fails, show a clear error message and offer manual entry fallback
- If the URL is unreachable, inform the user
- If no structured recipe data is found (no JSON-LD and HTML fallback yields nothing), return 422 with a helpful message
- Rate limit extraction calls per user (e.g., 20 imports/day)

### 4.2 Recipe Review & Edit

After extraction, present a full-screen modal/page with:
- Image thumbnails (removable, reorderable)
- Editable title field
- Editable ingredients (one per line, textarea)
- Editable instructions (one step per line, textarea)
- Cook time input (minutes)
- Meal type multi-select (tag pills)
- Cuisine multi-select (tag pills)
- Dietary multi-select (tag pills)
- "Save to Recipe Book" primary action
- "Back" secondary action (return to URL input)

### 4.3 Booklet Browser

The primary browsing experience is a **page-flip view** — one recipe displayed at a time in a full-screen or near-full-screen card overlay.

**Navigation:**
- Left/right arrow buttons on sides of the viewport
- Keyboard arrow keys (left/right)
- Swipe gestures on mobile (touch)
- Escape key or X button to close
- Page indicator: "3 / 24" in top corner

**Recipe page layout (within the booklet card):**
- Hero image (full-width, 300–400px height, 3:2 or 16:9 aspect ratio)
- Image carousel dots if multiple images
- Tags row (meal type, cuisine, dietary, cook time)
- Title in display serif
- "View Original →" link to source URL
- Two-column layout (desktop/tablet): Ingredients left, Instructions right
- Single-column stacked layout on mobile
- Additional images gallery at bottom (thumbnail grid, tappable)

### 4.4 Search & Filter Bar

Positioned at the top of the recipe collection page:

- **Search input:** Text field with search icon, searches title, ingredients, cuisines, dietary, and tags
- **Meal type filter pills:** Breakfast, Lunch, Dinner, Snack, Dessert, Appetizer — toggle on/off
- **Cuisine filter pills:** Dynamically populated from user's saved cuisines
- **Dietary filter pills:** Dynamically populated from user's saved dietary tags
- **Cook time filter:** Optional range filter (Under 30 min, 30–60 min, 1–2 hours, 2+ hours)
- **Clear filters** action when any filter is active
- Filters apply to the booklet sequence (so flipping through only shows matching recipes)

### 4.5 Recipe Card Preview (Entry to Booklet)

Before entering the booklet view, recipes appear as a **grid of preview cards**:
- Hero image (3:2 aspect ratio)
- Category rubric label in red above title
- Title in display serif
- Subtitle: "X ingredients · Y steps"
- Cook time badge
- Hover: subtle image zoom, slight opacity shift on title
- Click: opens booklet view at that recipe's position

---

## 5. Design System

### 5.1 Design Philosophy

Mirror The New Yorker's editorial restraint: **typography is the primary visual element**, not color or decoration. The aesthetic is defined by what is omitted — no gradients, no shadows on cards, no rounded corners on content areas, no decorative icons. Thin horizontal rules and generous whitespace organize content. A single accent color (red) is used only for category/rubric labels.

### 5.2 Typography

The New Yorker uses three proprietary typeface families: **Irvin** (display), **Adobe Caslon Pro** (body), and **Neutraface** (UI/nav). Since Irvin is proprietary, use these accessible substitutions:

| Role | Original TNY Font | Substitute (Google Fonts) | Tailwind Token |
|------|-------------------|--------------------------|----------------|
| Display/Headlines | Irvin Display/Heading | **Playfair Display** | `font-display` |
| Body text | Adobe Caslon Pro | **Libre Baskerville** | `font-serif` |
| UI/Navigation | Neutraface Text | **Inter** | `font-sans` |

**Type scale (from TNY's verified CSS):**

| Element | Font | Size | Weight | Line-height | Letter-spacing | Other |
|---------|------|------|--------|-------------|----------------|-------|
| Hero display title | Display serif | 55px (desktop), 36px (mobile) | 900 | 1.0 | normal | — |
| Recipe title | Display serif | 38–40px (desktop), 28px (mobile) | 700 | 1.0 | -0.1px | — |
| Rubric/category label | Display serif | 12–13px | 400 | 15px | normal | Color: red `#DF3331` |
| Subtitle/deck | Body serif | 18px | 400 | 27px | normal | Italic |
| Body text | Body serif | 18–20px | 400 | 28px (140–150%) | normal | — |
| Navigation links | Sans-serif | 14px | 700 | 14px | 0px | Uppercase |
| Byline/metadata | Sans-serif | 12–14px | 600 | — | 0.05em | Uppercase |
| Ingredient list | Body serif | 16px | 400 | 1.7 | normal | — |
| Step numbers | Display serif | 20px | 900 | — | — | Color: red, opacity: 0.4 |

**Key typographic rules:**
- Headlines use **1:1 line-height** (extremely tight)
- Body text uses **140–150% line-height** (generous, for readability)
- Navigation is always **bold, uppercase** in sans-serif
- Category/rubric labels are always in **red** — this is the signature element

### 5.3 Color Palette

The New Yorker uses an intentionally minimal palette: black, white, grays, and one accent red.

```
Primary Palette
──────────────────────────────────────────────
Token               Hex         Usage
──────────────────────────────────────────────
black               #000000     Headlines, body copy
gray-950            #181818     Deepest text (Almost Black)
gray-900            #232323     Navigation text
gray-800            #2F2F2F     Very Dark Gray
gray-600            #5F5F5F     Secondary text, metadata
gray-500            #949494     Muted text, timestamps
gray-300            #C6C6C6     Dividers, borders
gray-200            #E6E6E6     Light dividers
gray-50             #F5F5F5     Section backgrounds
white               #FFFFFF     Page background
red (accent)        #DF3331     Rubric labels, category tags ONLY
red-dark            #CA2121     Hover state for red accent
```

**Color rules:**
- Page background is always **white**
- Text is always **black** or **gray scale**
- Red is used **exclusively** for category/rubric labels — nowhere else
- No colored backgrounds on cards or content areas
- No gradients, no shadows, no colored borders
- Dividers are `1px` rules in `gray-300` or `black` at low opacity

### 5.4 Layout & Spacing

**Responsive breakpoints (matching TNY's internal SASS):**

| Tier | Breakpoint | Tailwind | Layout |
|------|-----------|----------|--------|
| Mobile | 0–639px | Default | Single column, hamburger nav, stacked content |
| Tablet | 640–959px | `sm:` | 2-column grids, expanded nav |
| Desktop | 960px+ | `md:` | Full multi-column, horizontal nav |
| Wide | 1280px+ | `lg:` | Max-width container, centered |

**Content widths:**
- Article/recipe body: **max-width 700px**, centered
- Homepage/collection grid: **max-width 1200px**
- Booklet card overlay: **max-width 680px** (desktop), **92vw** (mobile)

**Spacing philosophy:**
- Generous vertical spacing between sections
- Typography size contrast drives hierarchy (55px headline vs 13px rubric = 4:1 ratio)
- Whitespace is the primary organizational tool, not borders or backgrounds

### 5.5 Component Patterns

**Navigation bar:**
- Sticky top bar
- App name/logo centered in display serif
- Bold uppercase sans-serif section links
- Hamburger menu on mobile
- Subtle shrink animation on scroll-down

**Recipe cards (grid view):**
- No border, no shadow, no rounded corners
- Hero image with 3:2 aspect ratio
- Red rubric label above title (e.g., "DINNER")
- Display serif title
- Italic serif subtitle
- Hover: subtle opacity shift on text, no card elevation change

**Dividers:**
- `1px solid` horizontal rules in `gray-300` or `black/20`
- Used sparingly between sections
- Whitespace does most separation work

**Tag/filter pills:**
- Simple, restrained pill styling
- Inactive: light gray background, dark gray text
- Active: black background, white text (or red for category labels)
- Small, uppercase sans-serif text

**Buttons:**
- Primary: black background, white text, no border-radius (or very subtle 2px)
- Secondary: white background, black border, black text
- Minimal styling — no shadows, no gradients

**Modals/overlays:**
- Backdrop: `rgba(0,0,0,0.6)` with `backdrop-filter: blur(8px)`
- Content card: white, minimal border-radius (8px max)
- Slide-up entrance animation
- Close button: subtle, top-right

### 5.6 Motion & Interactions

The New Yorker treats motion with extreme restraint. Follow the same philosophy:

- **Hover states:** Subtle color/opacity transitions, `200ms ease`
- **Page transitions:** None — standard Next.js navigation
- **Card hover:** Image zoom `scale(1.03)` with `400ms` transition, text opacity shift
- **Modal entrance:** `translateY(20px) → translateY(0)` with `350ms cubic-bezier(0.16,1,0.3,1)`
- **Scroll behavior:** Smooth scroll for anchor links only
- **Loading states:** Simple spinner or skeleton, no elaborate animations
- **No parallax, no scroll-triggered animations, no decorative motion**

### 5.7 Tailwind Configuration

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '960px',
      'lg': '1280px',
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#FFFFFF',
      gray: {
        950: '#181818',
        900: '#232323',
        800: '#2F2F2F',
        600: '#5F5F5F',
        500: '#949494',
        300: '#C6C6C6',
        200: '#E6E6E6',
        50: '#F5F5F5',
      },
      red: {
        DEFAULT: '#DF3331',
        dark: '#CA2121',
      },
    },
    fontFamily: {
      display: ['"Playfair Display"', 'Georgia', 'serif'],
      serif: ['"Libre Baskerville"', 'Georgia', 'serif'],
      sans: ['Inter', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
    },
    fontSize: {
      'xs': ['12px', { lineHeight: '15px' }],
      'sm': ['13px', { lineHeight: '15px' }],
      'base': ['14px', { lineHeight: '14px' }],
      'lg': ['18px', { lineHeight: '27px' }],
      'xl': ['20px', { lineHeight: '28px' }],
      '2xl': ['28px', { lineHeight: '32px' }],
      '3xl': ['38px', { lineHeight: '38px' }],
      '4xl': ['40px', { lineHeight: '40px' }],
      '5xl': ['55px', { lineHeight: '55px' }],
    },
    letterSpacing: {
      tighter: '-0.1px',
      tight: '-0.05em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
    extend: {
      maxWidth: {
        'article': '700px',
        'container': '1200px',
      },
      borderWidth: {
        '0.5': '0.5px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      aspectRatio: {
        '3/2': '3 / 2',
      },
    },
  },
  plugins: [],
}
```

### 5.8 Google Fonts Import

```css
/* globals.css or layout.tsx */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
```

Or use `next/font` for performance:

```tsx
// src/app/layout.tsx
import { Playfair_Display, Libre_Baskerville, Inter } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
```

---

## 6. Technical Architecture

### 6.1 Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14+** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS 3.4+** |
| Database | **PostgreSQL** |
| ORM | **Prisma** |
| Authentication | **NextAuth.js** (Auth.js v5) — Email/password + Google OAuth |
| Extraction | **Cheerio** — JSON-LD (`schema.org/Recipe`) parsing + HTML fallback selectors. No external AI API required. |
| Image Storage | Store image URLs from source blogs (no re-hosting in v1). Consider Cloudinary or S3 for future image caching/optimization. |
| Deployment | **Vercel** (recommended) or any Node.js host |
| Package Manager | **pnpm** (recommended) or npm |

### 6.2 Project Structure

```
recipe-book/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── fonts/                    # If self-hosting fonts
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with fonts, nav
│   │   ├── page.tsx              # Landing / redirect to /recipes
│   │   ├── globals.css           # Tailwind directives + base styles
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── recipes/
│   │   │   ├── page.tsx          # Collection view (grid + booklet)
│   │   │   └── [id]/page.tsx     # Single recipe deep link
│   │   ├── import/
│   │   │   └── page.tsx          # Import flow
│   │   ├── settings/
│   │   │   └── page.tsx          # Account settings
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── recipes/
│   │       │   ├── route.ts      # GET (list), POST (create)
│   │       │   └── [id]/route.ts # GET, PUT, DELETE
│   │       └── extract/
│   │           └── route.ts      # POST — server-side recipe extraction endpoint
│   ├── components/
│   │   ├── ui/                   # Generic UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Tag.tsx
│   │   │   ├── TagSelector.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Divider.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── MobileMenu.tsx
│   │   │   └── Footer.tsx
│   │   ├── recipes/
│   │   │   ├── RecipeCard.tsx     # Grid preview card
│   │   │   ├── RecipePage.tsx     # Full booklet page view
│   │   │   ├── RecipeBooklet.tsx  # Booklet wrapper with navigation
│   │   │   ├── RecipeGrid.tsx     # Card grid layout
│   │   │   ├── FilterBar.tsx      # Search + filter controls
│   │   │   ├── ImageCarousel.tsx  # Hero image with dots
│   │   │   └── ImportForm.tsx     # URL input + review/edit form
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── SignupForm.tsx
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── auth.ts               # NextAuth config
│   │   ├── scraper.ts             # JSON-LD + HTML recipe extraction logic
│   │   └── utils.ts              # Shared utilities
│   ├── hooks/
│   │   ├── useRecipes.ts         # Recipe CRUD hooks
│   │   ├── useFilters.ts         # Filter state management
│   │   └── useKeyboardNav.ts     # Booklet keyboard navigation
│   └── types/
│       └── index.ts              # TypeScript types
├── .env.local                    # Environment variables
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 7. Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Hashed, for email/password auth
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  recipes       Recipe[]
  accounts      Account[]
  sessions      Session[]
}

// NextAuth required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Core recipe models
model Recipe {
  id           String   @id @default(cuid())
  userId       String
  title        String
  sourceUrl    String?
  cookTime     Int?     // Minutes
  images       String[] // Array of image URLs
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
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
  id       String      @id @default(cuid())
  name     String
  type     TagType     // MEAL_TYPE, CUISINE, DIETARY
  recipes  RecipeTag[]

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

### Seed Data (Default Tags)

```ts
// prisma/seed.ts
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer']
const cuisines = ['Italian', 'Mexican', 'Thai', 'Japanese', 'Indian', 'French',
                  'American', 'Mediterranean', 'Chinese', 'Korean', 'Vietnamese',
                  'Middle Eastern', 'Greek', 'Other']
const dietary = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Keto',
                 'Paleo', 'Nut-Free', 'Low-Carb']
```

---

## 8. API Routes

### `POST /api/extract`

Server-side recipe extraction from URL.

**Request:**
```json
{ "url": "https://example.com/recipe" }
```

**Response:**
```json
{
  "title": "...",
  "ingredients": ["..."],
  "instructions": ["..."],
  "images": ["..."],
  "suggestedMealTypes": ["..."],
  "suggestedCuisines": ["..."],
  "suggestedDietary": ["..."],
  "suggestedCookTimeMinutes": 45
}
```

**Implementation notes:**
- Requires authenticated session
- Rate limited: 20 requests/user/day
- Server-side only — API key never exposed to client
- Use web search or fetch tool to access the URL content
- Prompt should instruct the model to extract 2–8 food/step images, skipping logos, ads, and icons

### `GET /api/recipes`

List all recipes for the authenticated user.

**Query params:** `?search=&mealType=&cuisine=&dietary=&cookTimeMax=&cookTimeMin=&page=&limit=`

**Response:** Paginated array of recipes with tags.

### `POST /api/recipes`

Create a new recipe.

**Request body:** Full recipe data including ingredients, instructions, tag IDs, images, etc.

### `GET /api/recipes/[id]`

Get a single recipe with all related data.

### `PUT /api/recipes/[id]`

Update a recipe. Verify ownership.

### `DELETE /api/recipes/[id]`

Delete a recipe. Verify ownership.

---

## 9. Page & Component Structure

### 9.1 Root Layout (`layout.tsx`)

- Load Google Fonts via `next/font`
- Apply font CSS variables to `<body>`
- Render `<Navbar />` (sticky, with auth state)
- Render `{children}`
- No footer needed (minimal chrome)

### 9.2 Navbar Component

**Desktop (md+):**
- Left: App name in display serif ("Recipe Book")
- Center: Nav links in bold uppercase sans-serif — "Recipes", "Import"
- Right: User avatar/initial circle + settings dropdown

**Mobile (< sm):**
- Left: Hamburger menu icon
- Center: App name
- Right: User avatar
- Hamburger opens slide-out with nav links

**Scroll behavior:** Subtle height reduction on scroll-down (optional, v2).

### 9.3 Recipe Collection Page (`/recipes`)

**Layout:**
1. `<FilterBar />` — sticky below nav
2. `<RecipeGrid />` — responsive card grid
3. `<RecipeBooklet />` — full-screen overlay when a card is clicked

**Empty state:**
- Centered illustration (simple, editorial — e.g., an open book icon)
- "Your recipe book is empty"
- "Start collecting recipes from your favorite food blogs."
- "Import First Recipe" primary button

### 9.4 RecipeCard Component

```
┌─────────────────────────┐
│                         │
│    [Hero Image 3:2]     │
│                         │
├─────────────────────────┤
│ DINNER                  │  ← Red rubric label, display serif 12px
│ Braised Short Ribs      │  ← Display serif 20px, tight leading
│ A weekend project       │  ← Italic serif 14px, gray-600
│ worth every hour.       │
│ 12 ingredients · 8 steps│  ← Sans 12px, gray-500
└─────────────────────────┘
```

No border. No shadow. No rounded corners. Separation via whitespace only.

### 9.5 RecipePage Component (Booklet View)

```
┌──────────────────────────────────────┐
│ 3/24                            [×]  │  ← Page indicator + close
│                                      │
│         [Hero Image]                 │
│         ● ○ ○ ○ ○                    │  ← Carousel dots
│                                      │
│ ──────────────────────────────────── │  ← 1px rule
│                                      │
│ DINNER · ITALIAN · 45 min           │  ← Tag row
│                                      │
│ Braised Short Ribs                   │  ← Title, display serif 38px
│ View Original →                      │  ← Red link, 12px
│                                      │
│ ──────────────────────────────────── │
│                                      │
│ INGREDIENTS    │  INSTRUCTIONS       │  ← Two-column (desktop)
│                │                     │
│ ● 3 lbs ribs  │  01  Season ribs    │
│ ● 2 onions    │      generously...  │
│ ● 4 cloves    │  02  Sear in hot    │
│   garlic      │      Dutch oven...  │
│ ● 2 cups wine │  03  Add vegetables │
│ ● ...         │      and deglaze... │
│                │                     │
│ ──────────────────────────────────── │
│                                      │
│ [thumb] [thumb] [thumb] [thumb]      │  ← Additional images grid
│                                      │
└──────────────────────────────────────┘
  [←]                              [→]    ← Prev/Next navigation
```

Mobile: single-column stacked layout (ingredients above instructions).

### 9.6 Import Page (`/import`)

Two-step flow:

**Step 1 — URL Input:**
- Large heading: "Import a Recipe"
- URL input field with placeholder
- "Extract Recipe" primary button
- Loading state with spinner and "Extracting recipe..."

**Step 2 — Review & Edit:**
- Image thumbnail row (removable)
- Title input
- Ingredients textarea (one per line)
- Instructions textarea (one per line)
- Cook time input
- Tag selectors (meal type, cuisine, dietary)
- "Save to Recipe Book" primary button
- "Back" secondary button

---

## 10. Authentication

### Provider: NextAuth.js (Auth.js v5)

**Supported auth methods:**
1. **Email + Password** — using Credentials provider with bcrypt-hashed passwords
2. **Google OAuth** — for one-click sign-in
3. (Optional) **GitHub OAuth** — for developer users

**Session strategy:** JWT (stateless, works well with Vercel Edge)

**Protected routes:** All routes except `/`, `/login`, `/signup` require authentication. Use Next.js middleware for route protection.

**Environment variables required:**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-secret>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
DATABASE_URL=postgresql://user:password@host:5432/recipebook
```

---

## 11. Deployment & Environment

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Extraction (no API key required — uses server-side scraping)
# AI extraction deferred to future phase
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=

# Optional
RATE_LIMIT_DAILY=20
```

### Deployment (Vercel — Recommended)

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Add PostgreSQL via Vercel Postgres, Supabase, Neon, or Railway
4. Prisma migrations run on deploy via `prisma migrate deploy`
5. Add `postinstall` script: `"postinstall": "prisma generate"`

---

## 12. Implementation Phases

### Phase 1 — Foundation (MVP)

- [ ] Initialize Next.js 14 project with TypeScript, Tailwind
- [ ] Configure Tailwind with the design system (colors, fonts, type scale, breakpoints)
- [ ] Set up Google Fonts via `next/font`
- [ ] Set up Prisma with PostgreSQL schema
- [ ] Run initial migration and seed default tags
- [ ] Implement NextAuth with email/password + Google OAuth
- [ ] Build login and signup pages
- [ ] Build root layout with Navbar component
- [ ] Implement middleware for route protection

### Phase 2 — Core Recipe Features

- [ ] Build `/api/extract` route with server-side recipe extraction
- [ ] Build Import page (URL input → extraction → review/edit → save)
- [ ] Build `/api/recipes` CRUD routes
- [ ] Build RecipeCard component
- [ ] Build RecipeGrid component
- [ ] Build recipe collection page (`/recipes`)
- [ ] Implement empty state

### Phase 3 — Booklet & Filtering

- [ ] Build RecipePage component (full booklet layout)
- [ ] Build RecipeBooklet wrapper with prev/next navigation
- [ ] Add keyboard navigation (arrow keys, escape)
- [ ] Add swipe gesture support (mobile)
- [ ] Build FilterBar with search + tag filters
- [ ] Implement server-side filtering in API
- [ ] Build single recipe deep link page (`/recipes/[id]`)

### Phase 4 — Polish & Refinement

- [ ] Add recipe edit functionality
- [ ] Add recipe delete with confirmation
- [ ] Implement image carousel in booklet view
- [ ] Add loading skeletons matching the design system
- [ ] Add error boundaries and fallback states
- [ ] Responsive testing across mobile, tablet, desktop
- [ ] Performance optimization (image lazy loading, pagination)
- [ ] Add rate limiting to extract endpoint
- [ ] Settings page (account management)

### Phase 5 — Future Enhancements (Post-MVP)

- [ ] Image caching/optimization (Cloudinary or S3)
- [ ] Recipe sharing via public links
- [ ] Meal planning / weekly planner
- [ ] Grocery list generation from selected recipes
- [ ] Print-friendly recipe layout
- [ ] PWA support for offline access
- [ ] Recipe collections / folders
- [ ] Import from Instagram / TikTok recipe posts

---

## Appendix: Component Class Reference

Quick reference for applying the design system via Tailwind classes:

```html
<!-- Rubric/Category label (the signature element) -->
<span class="font-display text-sm font-normal text-red tracking-normal">
  Desserts
</span>

<!-- Recipe title -->
<h1 class="font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-none tracking-tighter text-black">
  A Perfect Lemon Tart
</h1>

<!-- Subtitle/deck -->
<p class="font-serif text-lg italic font-normal text-gray-600">
  The balance between sweet and tart, perfected.
</p>

<!-- Body text -->
<div class="font-serif text-lg md:text-xl font-normal leading-relaxed text-black max-w-article mx-auto">
  <p>Begin by preparing the crust...</p>
</div>

<!-- Navigation link -->
<a class="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors">
  Recipes
</a>

<!-- Byline/metadata -->
<span class="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600">
  12 ingredients · 8 steps
</span>

<!-- Horizontal rule -->
<hr class="border-t border-gray-300 my-8" />

<!-- Primary button -->
<button class="bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors">
  Save to Recipe Book
</button>

<!-- Secondary button -->
<button class="bg-white text-black font-sans text-base font-semibold px-8 py-3 border border-black hover:bg-gray-50 transition-colors">
  Cancel
</button>

<!-- Tag pill (inactive) -->
<span class="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-600 font-sans text-xs font-semibold uppercase tracking-wide">
  Italian
</span>

<!-- Tag pill (active) -->
<span class="inline-flex items-center px-3 py-1 bg-black text-white font-sans text-xs font-semibold uppercase tracking-wide">
  Italian
</span>

<!-- Recipe card -->
<article class="group">
  <div class="aspect-3/2 overflow-hidden">
    <img class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400" />
  </div>
  <span class="font-display text-sm text-red mt-3 block">Mains</span>
  <h2 class="font-display text-xl leading-none mt-1 group-hover:opacity-80 transition-opacity">
    Braised Short Ribs
  </h2>
  <p class="font-serif text-base italic text-gray-600 mt-1">
    A weekend project worth every hour.
  </p>
  <span class="font-sans text-xs text-gray-500 mt-2 block">12 ingredients · 8 steps</span>
</article>
```

---

*This PRD is designed to be used with Claude Code or similar AI coding assistants. Each section provides enough specificity for implementation while remaining flexible on exact library choices where noted.*

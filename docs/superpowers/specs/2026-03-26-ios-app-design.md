# iOS App Design Spec

> Convert the Recipe Book web app into a fully functional iOS app using Capacitor, with full offline support, sync, and native polish.

**Date:** 2026-03-26
**Approach:** Static export + hosted API. Capacitor wraps a Next.js static build. API routes stay on Vercel. Full offline read/write with IndexedDB and background sync.

---

## 1. Architecture Overview

### Two Deployment Targets

1. **Web (Vercel)** — Unchanged. Next.js SSR app with API routes. Also serves as the API backend for the iOS app.
2. **iOS (Capacitor)** — Static export of the Next.js frontend, wrapped in a native iOS shell. All API calls go to the Vercel URL (e.g., `https://recipebook.vercel.app/api/...`).

### API Base URL

- New env variable: `NEXT_PUBLIC_API_BASE_URL`
- Web build: empty string (relative paths, same origin)
- Capacitor build: full Vercel deployment URL
- A helper `apiUrl(path)` wraps all fetch calls: `` return `${API_BASE_URL}${path}` ``

### Offline Architecture

- **IndexedDB** stores the full recipe collection locally
- **Sync on launch** — on app open, fetch all recipes updated since last sync timestamp via `GET /api/recipes/sync?since={timestamp}`
- **Offline writes** — edits, favorites, and deletes are queued in IndexedDB `pendingChanges` store and replayed when back online
- **Conflict resolution** — last-write-wins using `updatedAt` timestamps (sufficient for single-user)
- **Service worker** — caches static assets (JS, CSS, fonts) and recipe images

### Auth Handling

- Supabase auth tokens in localStorage work inside the Capacitor WebView
- Google OAuth uses `@capacitor/browser` plugin to open an in-app browser for the OAuth flow, then redirects back
- Callback URL `com.recipebook.app://` needs to be added to Supabase's allowed redirect URLs

---

## 2. PWA Foundations & App Assets

### Meta Tags (added to `layout.tsx`)

- `viewport`: `width=device-width, initial-scale=1, viewport-fit=cover`
- `apple-mobile-web-app-capable`: yes
- `apple-mobile-web-app-status-bar-style`: black-translucent
- `theme-color`: #FFFFFF

### Manifest (`public/manifest.json`)

```json
{
  "name": "Recipe Book",
  "short_name": "Recipes",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#FFFFFF",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### App Icons (`public/`)

- `icon-192.png` — 192x192 (manifest)
- `icon-512.png` — 512x512 (manifest)
- `apple-touch-icon.png` — 180x180
- `favicon.ico` — 32x32
- Design: "RB" lettermark in Playfair Display on white background, or a minimal open-book icon
- All generated from a single 1024x1024 source via build script

### Splash Screens

Handled by `@capacitor/splash-screen` plugin, not manual assets.

---

## 3. Offline Data Layer

### New Module: `src/lib/offline/`

**`db.ts`** — IndexedDB wrapper using the `idb` library (lightweight, promise-based).

Two object stores:
- **`recipes`** — keyed by recipe ID, stores full `RecipeDetail` objects with all ingredients, instructions, tags, nutrition
- **`pendingChanges`** — queued offline mutations: `{ id: string, type: "update" | "delete" | "favorite", payload: any, createdAt: string }`

**`sync.ts`** — Sync engine:
- `syncAll()` — called on app launch. Fetches `GET /api/recipes/sync?since={lastSyncTimestamp}`. Returns recipes updated/created after that timestamp, plus IDs of deleted recipes. Upserts into IndexedDB, removes deleted ones, stores new sync timestamp.
- `replayPendingChanges()` — called when back online. Replays queued mutations against the API in order, removes from queue on success.
- `isOnline()` — checks `navigator.onLine` and listens to online/offline events.

**`hooks.ts`** — React hooks:
- `useOfflineRecipes()` — returns recipes from IndexedDB, falls back to API when online. Triggers sync on mount.
- `useOfflineMutation()` — wraps recipe edits. When online, calls API directly and updates IndexedDB. When offline, queues to `pendingChanges` and updates IndexedDB optimistically.

### New API Endpoint: `GET /api/recipes/sync`

- Query param: `since` (ISO timestamp, optional — if omitted, returns all)
- Response: `{ updated: RecipeDetail[], deletedIds: string[], syncTimestamp: string }`
- Includes full recipe detail (ingredients, instructions, tags, nutrition) for each updated recipe
- `deletedIds` tracks recipes removed since the last sync (requires a soft-delete or deletion log mechanism)

### Deletion Tracking

Add a `RecipeDeletion` model to track deleted recipe IDs:

```prisma
model RecipeDeletion {
  id        String   @id @default(cuid())
  recipeId  String
  userId    String
  deletedAt DateTime @default(now())

  @@index([userId, deletedAt])
}
```

When a recipe is deleted via `DELETE /api/recipes/[id]`, insert a row into `RecipeDeletion` before the cascade delete. The sync endpoint queries this table for deletions since the `since` timestamp. Deletion records older than 90 days are cleaned up (deletions that old will have been synced by any active client).

---

## 4. Service Worker

### File: `public/sw.js` (registered from `layout.tsx`)

**Three caching strategies:**

1. **Static assets** (JS, CSS, fonts) — Cache-first. Cached on install, served from cache, updated in background.
2. **Recipe images** (Supabase storage URLs) — Network-first with cache fallback. Cached on first view, refreshed when online.
3. **API responses** — Not cached by service worker. IndexedDB handles data caching with full sync logic.

**Lifecycle:**
- `install` — pre-cache app shell (HTML, JS, CSS from build output)
- `activate` — clean up old caches from previous versions
- `fetch` — intercept requests, apply strategy based on URL pattern

**Image cache limit:** 500MB with LRU eviction.

### Online/Offline Detection

- Listen to `online`/`offline` events on `window`
- On `online` event: trigger `replayPendingChanges()` then `syncAll()`
- Show a subtle banner when offline (see Section 6)

---

## 5. Capacitor Integration

### Static Export Configuration

- Add `output: 'export'` to `next.config.ts` gated behind `CAPACITOR_BUILD` env variable
- Web deploys are unaffected — only `CAPACITOR_BUILD=true pnpm next build` produces static output to `out/`

### Capacitor Config (`capacitor.config.ts`)

```typescript
const config: CapacitorConfig = {
  appId: "com.recipebook.app",
  appName: "Recipe Book",
  webDir: "out",
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#FFFFFF",
    },
  },
};
```

### Capacitor Plugins

- `@capacitor/splash-screen` — native splash screen
- `@capacitor/status-bar` — status bar styling
- `@capacitor/haptics` — haptic feedback
- `@capacitor/network` — network status detection (supplements navigator.onLine)
- `@capacitor/browser` — in-app browser for OAuth flow

### Build & Run Flow

```bash
CAPACITOR_BUILD=true pnpm next build    # static export to out/
npx cap sync ios                         # sync web assets to iOS project
npx cap open ios                         # open in Xcode
```

---

## 6. Native Polish

### Safe Areas

- Add `env(safe-area-inset-*)` padding to root layout and sticky navbar via Tailwind arbitrary values
- `viewport-fit=cover` (from Section 2) enables full-screen content behind notch/Dynamic Island
- Bottom navigation/action buttons padded for home indicator

### Haptic Feedback

Use `@capacitor/haptics` via a `useHaptics()` hook that no-ops gracefully on web:

| Interaction | Haptic Type |
|-------------|-------------|
| Tag pill toggle | Light impact |
| Favorite toggle | Light impact |
| Ingredient checkbox | Light impact |
| Recipe save | Medium impact |
| Delete confirmation | Medium impact |

### Pull-to-Refresh

- Recipe collection page (`/recipes`)
- Native pull gesture triggers `syncAll()` + re-render from IndexedDB
- Simple touch event implementation (touchstart/touchmove/touchend), no heavy library

### Swipe Gestures

- Extend existing swipe logic from `CookingMode` to `RecipeBooklet`
- Left/right swipe navigates between recipes in booklet view

### Network Status Banner

- Thin bar below navbar when offline: "Offline — changes will sync when reconnected"
- Auto-dismisses after successful sync when back online
- Styled: `bg-gray-900 text-white font-sans text-xs font-semibold uppercase tracking-wider text-center py-1`

---

## 7. Files Changed / Created Summary

### New Files
- `public/manifest.json`
- `public/sw.js`
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/favicon.ico`
- `capacitor.config.ts`
- `src/lib/offline/db.ts`
- `src/lib/offline/sync.ts`
- `src/lib/offline/hooks.ts`
- `src/lib/api.ts` (apiUrl helper)
- `src/hooks/useHaptics.ts`
- `src/hooks/useNetworkStatus.ts`
- `src/components/ui/OfflineBanner.tsx`
- `src/app/api/recipes/sync/route.ts`

### Modified Files
- `src/app/layout.tsx` — meta tags, service worker registration, manifest link
- `next.config.ts` — conditional static export
- `package.json` — new dependencies (idb, @capacitor/*)
- `prisma/schema.prisma` — RecipeDeletion model
- `src/app/api/recipes/[id]/route.ts` — log deletions to RecipeDeletion
- `src/components/recipes/RecipeCollection.tsx` — pull-to-refresh, offline data source
- `src/components/recipes/RecipeBooklet.tsx` — swipe gesture extension
- `src/components/layout/Navbar.tsx` — safe area padding, offline banner
- Various components — haptic feedback calls on interactions

### New Dependencies
- `idb` — IndexedDB promise wrapper
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`
- `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/network`, `@capacitor/browser`

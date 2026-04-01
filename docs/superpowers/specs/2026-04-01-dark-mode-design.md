# Dark Mode Design Spec

> Add light/dark/system theme setting with true inversion dark mode, inheriting from OS preference by default.

**Date:** 2026-04-01

---

## 1. Theme Setting

**New field on UserSettings model:**
```prisma
theme String @default("system") // "system" | "light" | "dark"
```

**Added to `UserSettingsData` type:**
```typescript
theme: "system" | "light" | "dark";
```

**DEFAULT_SETTINGS:** `theme: "system"`

**Settings page UI:** Three-way toggle (System / Light / Dark) in Display Preferences section, above Measurement System. Same button-group style as Imperial/Metric.

**Settings API:** Add `theme` to GET/PUT handlers alongside existing fields.

---

## 2. Dark Mode Color Mapping

True inversion — swap black↔white. Red accent unchanged.

| Token | Light | Dark |
|-------|-------|------|
| Page background | `#FFFFFF` | `#000000` |
| Primary text | `#000000` | `#FFFFFF` |
| gray-950 | `#181818` | `#E8E8E8` |
| gray-900 | `#232323` | `#E0E0E0` |
| gray-800 | `#2F2F2F` | `#D0D0D0` |
| gray-600 | `#5F5F5F` | `#A0A0A0` |
| gray-500 | `#949494` | `#707070` |
| gray-300 | `#C6C6C6` | `#333333` |
| gray-200 | `#E6E6E6` | `#2A2A2A` |
| gray-50 | `#F5F5F5` | `#111111` |
| Red accent | `#DF3331` | `#DF3331` |
| Red dark | `#CA2121` | `#CA2121` |

**Button inversion:**
- Primary (bg-black, text-white) → dark: bg-white, text-black
- Secondary (bg-white, border-black) → dark: bg-#111, border-white

---

## 3. CSS Implementation

Use CSS custom properties redefined under `.dark` selector in `globals.css`. This avoids adding `dark:` classes to every component.

```css
.dark {
  --color-black: #FFFFFF;
  --color-white: #000000;
  --color-gray-950: #E8E8E8;
  --color-gray-900: #E0E0E0;
  --color-gray-800: #D0D0D0;
  --color-gray-600: #A0A0A0;
  --color-gray-500: #707070;
  --color-gray-300: #333333;
  --color-gray-200: #2A2A2A;
  --color-gray-50: #111111;
}
```

Since the app uses `bg-white`, `text-black`, `border-gray-300` etc. throughout, redefining these tokens makes all components switch automatically.

**Print override:** Add `@media print` rule that resets to light values so recipes always print light.

---

## 4. ThemeProvider Component

**File:** `src/components/ThemeProvider.tsx`

Client component that:
1. Reads `theme` from `useSettings()`
2. When `"system"`: listens to `matchMedia("(prefers-color-scheme: dark)")` and toggles `dark` class on `<html>`
3. When `"light"`: removes `dark` class
4. When `"dark"`: adds `dark` class
5. Caches the resolved theme in `localStorage("theme-resolved")` for flash prevention

**Rendered in `layout.tsx`** after Navbar.

---

## 5. Flash Prevention

**Inline script in `layout.tsx`** (before React hydration):

```javascript
(function() {
  var t = localStorage.getItem("theme-resolved");
  if (t === "dark") document.documentElement.classList.add("dark");
})();
```

This runs synchronously before first paint, applying the dark class immediately if the user was previously in dark mode. The ThemeProvider reconciles on mount.

---

## 6. Component-Specific Fixes

Most components auto-switch via token redefinition. Manual fixes needed:

1. **Navbar avatar** (`bg-gray-900 text-white`) — needs `dark:bg-gray-200 dark:text-black`
2. **Cooking mode** — keep dark regardless of theme (already black bg + white text)
3. **Image lightbox** — backdrop stays dark in both modes
4. **Print styles** — always light mode via `@media print` override
5. **Meta theme-color** — ThemeProvider updates `<meta name="theme-color">` to `#000000` in dark mode, `#FFFFFF` in light

---

## 7. Files Summary

### New Files
- `src/components/ThemeProvider.tsx`

### Modified Files
- `prisma/schema.prisma` — add `theme` to UserSettings
- `src/types/index.ts` — add `theme` to UserSettingsData + DEFAULT_SETTINGS
- `src/app/globals.css` — add `.dark` token overrides + print override
- `src/app/layout.tsx` — add ThemeProvider + inline flash prevention script
- `src/app/api/settings/route.ts` — add `theme` to GET/PUT
- `src/app/settings/page.tsx` — add theme toggle UI
- `src/components/layout/Navbar.tsx` — dark: override on avatar

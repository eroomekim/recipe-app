# Cook Log & Story Elevation Design Spec

> Add "I Made This" cook logging with optional notes, and elevate the personal story to a prominent headnote position in the recipe layout.

**Date:** 2026-04-01

---

## 1. "I Made This" Cook Log

### Data Model

New Prisma model:

```prisma
model CookLog {
  id        String   @id @default(cuid())
  recipeId  String
  userId    String
  note      String?
  cookedAt  DateTime @default(now())

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([recipeId])
  @@index([userId])
}
```

Add `cookLogs CookLog[]` relation to the Recipe model.

### API

**`POST /api/recipes/[id]/cook-log`**

Request: `{ note?: string }`

Response: `{ id, note, cookedAt }`

Creates a new cook log entry for the authenticated user's recipe. Validates recipe ownership.

**`GET /api/recipes/[id]/cook-log`**

Response:
```json
{
  "totalCooks": 3,
  "lastCookedAt": "2026-03-28T00:00:00.000Z",
  "entries": [
    { "id": "...", "note": "Used less salt", "cookedAt": "2026-03-28T..." },
    { "id": "...", "note": null, "cookedAt": "2026-03-15T..." }
  ]
}
```

Returns all entries ordered by `cookedAt` descending.

### UI

**"I Made This" button** — added to the action buttons row (next to Cook, Favorite, Print). Styled identically to the existing action buttons: bordered, uppercase sans-serif, with an icon.

**On tap:**
1. A small inline form slides open below the action buttons
2. Single-line text input with placeholder "How did it go? (optional)"
3. "Log" button to save
4. Pressing Enter or tapping "Log" saves the entry (empty note is fine — just records the date)
5. Form closes after save

**Cook count display** — shown as a subtle metadata line below the action buttons:
- When cooks exist: "Made 3 times · Last made Mar 15"
- Clicking the text expands to show the full log: a list of dates with notes
- When no cooks: nothing shown

### Component

New file: `src/components/recipes/CookLogButton.tsx`

Props: `{ recipeId: string }`

Fetches cook log on mount via `GET /api/recipes/[id]/cook-log`. Manages its own state for the inline form and log display.

---

## 2. Elevate the Story

### Layout Change

Current order in RecipePage header section:
1. Rubric (meal type · cuisine)
2. Title
3. Source link
4. Stats bar (cook time, servings, dietary, units)
5. Action buttons (cook, favorite, print)
6. Personal Notes ("Our Story" + Adaptations)

New order:
1. Rubric (meal type · cuisine)
2. Title
3. Source link
4. **Personal Notes ("Our Story" + Adaptations)** — moved up
5. Stats bar
6. Action buttons

### Style Changes to PersonalNotes Component

- Remove the left border treatment (`border-l-2 border-gray-200 pl-5`)
- Increase story text from `text-base` to `text-lg`
- Keep italic serif, keep gray-600 color
- Increase the "Add your story..." placeholder to `text-lg` to match
- Adaptations stay smaller (`text-sm`) beneath the story
- Increase vertical margin to `my-6` for breathing room between title and stats

### Files Changed

- `src/components/recipes/RecipePage.tsx` — reorder `{personalNotes}` block to before `{statsBlock}`
- `src/components/recipes/PersonalNotes.tsx` — update styles (remove border, increase text size)

---

## 3. Files Summary

### New Files
- `src/components/recipes/CookLogButton.tsx` — cook log button, inline form, and log display
- `src/app/api/recipes/[id]/cook-log/route.ts` — GET and POST handlers

### Modified Files
- `prisma/schema.prisma` — add CookLog model and Recipe relation
- `src/components/recipes/RecipePage.tsx` — add CookLogButton to action row, reorder PersonalNotes above stats
- `src/components/recipes/PersonalNotes.tsx` — update styles for headnote treatment

# Deploying Recipe Book to hosting.com cPanel (Node.js / Passenger)

This app is a **Next.js 16** server application. cPanel runs it via its
**Setup Node.js App** feature (Phusion Passenger). The custom entry point is
[`server.js`](./server.js).

> **Feature note — what does NOT work on shared cPanel:** importing recipes from
> Instagram / YouTube / TikTok / Facebook / Pinterest videos requires a headless
> Chromium browser (Playwright), which needs system libraries you can only
> install with root. On shared hosting those imports will fail. Everything else
> — pasting a recipe **blog URL**, AI structuring, the full recipe book,
> collections, grocery list, cooking mode — works normally.

The database, auth, and image storage are all hosted on **Supabase** (remote),
so cPanel only runs the Node web app. No database is installed on cPanel.

---

## 0. Prerequisites

- A Supabase project with the schema migrated and a storage bucket for images.
- The environment values listed in [`.env.local.example`](./.env.local.example).
- This repo pushed to GitHub: `git@github.com:eroomekim/recipe-app.git`.
- `recipe.mkmlive.ca` available as a subdomain of your hosting.com account.

---

## 1. Create the subdomain

cPanel → **Domains** → create `recipe.mkmlive.ca`. The document root cPanel
suggests can be left as-is; the Node app (step 3) takes over request handling
for this domain. After it resolves, enable HTTPS via cPanel → **SSL/TLS Status**
→ Run AutoSSL.

## 2. Get the code onto the server

cPanel → **Git™ Version Control** → **Create**:

- Clone URL: `https://github.com/eroomekim/recipe-app.git`
  (or the SSH URL if you've added the server's key to GitHub)
- Repository Path: e.g. `/home/USER/repositories/recipe-app`

Click **Create**, then **Pull or Deploy → Update from Remote** on later changes.

## 3. Create the Node.js application

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
|-------|-------|
| Node.js version | Highest available **≥ 20.9** (20.x or 22.x) |
| Application mode | **Production** |
| Application root | the repo path from step 2 |
| Application URL | `recipe.mkmlive.ca` |
| Application startup file | `server.js` |

Click **Create**.

## 4. Set environment variables

In the same Node App panel, add every variable from `.env.local.example`
(no surrounding quotes). Critical points:

- **`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are baked in
  at build time** — they must be set *before* you run the build in step 6.
- Set **`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`** so `npm install` doesn't try to
  download Chromium.
- Set **`NODE_ENV=production`**.
- `DATABASE_URL` = Supabase **pooled** connection string (runtime).
- `DIRECT_URL` = Supabase **direct** connection string (migrations only).

## 5. Install dependencies

The Node App panel shows a command to **enter the virtual environment**, e.g.:

```bash
source /home/USER/nodevenv/repositories/recipe-app/20/bin/activate && cd /home/USER/repositories/recipe-app
```

Run it in cPanel → **Terminal** (or SSH), then:

```bash
npm install
```

(Passenger uses npm. `package-lock.json` is committed. If `pnpm` is available in
your venv, `pnpm install --frozen-lockfile` is the lockfile this project is
developed against, but npm works fine.)

## 6. Run migrations (first deploy, and whenever the schema changes)

```bash
npx prisma migrate deploy
```

This uses `DIRECT_URL`. Skip if your Supabase database is already migrated.

## 7. Build

```bash
npm run build
```

This runs `prisma generate` then `next build`.

> **Low-memory hosting:** `next build` can need ~1 GB+. If it is killed/OOMs:
> - retry with `NODE_OPTIONS=--max-old-space-size=2048 npm run build`, or
> - build locally (`pnpm build`) and upload the generated `.next/` directory to
>   the application root, then skip this step.

## 8. Start / restart

Back in **Setup Node.js App**, click **Restart**. Passenger loads `server.js`,
which serves the app on the port Passenger provides.

## 9. Point Supabase auth back at the live URL

Supabase dashboard → **Authentication → URL Configuration**:

- Site URL: `https://recipe.mkmlive.ca`
- Redirect URLs: add `https://recipe.mkmlive.ca/auth/callback`

(The OAuth/auth callback route is `src/app/auth/callback`.)

---

## Updating after a code change

1. `git push` to GitHub (from your machine).
2. cPanel → Git Version Control → **Update from Remote**.
3. In Terminal/venv: `npm install` (if deps changed) → `npm run build`.
4. Setup Node.js App → **Restart**.

## Troubleshooting

- **502 / app won't start:** check `stderr.log` in the application root; usually
  a missing env var or a failed `npm run build` (no `.next` directory).
- **Client can't reach Supabase / "supabaseUrl is required":** the
  `NEXT_PUBLIC_*` vars were not set at build time — set them and rebuild.
- **Social/video import fails:** expected on shared hosting (no Chromium).

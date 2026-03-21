// src/lib/extraction/adapters/pinterest.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

/**
 * Extract the source blog URL from Pinterest page HTML.
 * Pinterest embeds the source URL in various places — rendered <a> tags,
 * JSON data in scripts, or meta tags. This tries multiple strategies.
 */
function extractSourceUrl(html: string): string | null {
  // Look for non-Pinterest HTTP URLs that look like recipe blog posts
  const urlPattern = /https?:\/\/(?!(?:[a-z]+\.)?pinterest\.com)(?!s\.pinimg\.com)[a-zA-Z0-9._-]+\.[a-z]{2,}\/[^\s"'\\<>]+/gi;
  const matches = html.match(urlPattern);
  if (!matches) return null;

  // Known non-recipe domains to skip
  const SKIP_DOMAINS = [
    "pinimg.com", "googleapis.com", "recaptcha.net", "gstatic.com",
    "google.com", "googletagmanager.com", "facebook.com", "facebook.net",
    "twitter.com", "instagram.com", "youtube.com", "apple.com", "amazon.com",
    "cloudflare.com", "w3.org", "schema.org", "cdn.", "static.", "assets.",
  ];

  // Deduplicate and prefer URLs without tracking params
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const rawUrl of matches) {
    // Clean up escaped unicode and trailing junk
    const cleaned = rawUrl
      .replace(/\\u0026/g, "&")
      .replace(/[)\]},;]+$/, "");

    try {
      const parsed = new URL(cleaned);

      // Skip infrastructure/non-recipe domains
      if (SKIP_DOMAINS.some((d) => parsed.hostname.includes(d))) continue;

      // Skip URLs that look like assets, not pages
      if (parsed.pathname.match(/\.(js|css|png|jpg|gif|svg|woff|ico|json|mjs)$/i)) continue;

      // Must have a meaningful path (not just "/")
      if (parsed.pathname.length <= 1) continue;

      const base = `${parsed.origin}${parsed.pathname}`;
      if (seen.has(base)) continue;
      seen.add(base);

      // Prefer URLs without utm params (cleaner)
      if (!parsed.search.includes("utm_")) {
        candidates.unshift(base);
      } else {
        candidates.push(base);
      }
    } catch {
      // Invalid URL
    }
  }

  return candidates[0] ?? null;
}

export const pinterestAdapter: PlatformAdapter = {
  name: "pinterest",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(3000);

      // Extract description
      const description = await page.$eval(
        'meta[property="og:description"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const title = await page.$eval(
        'meta[property="og:title"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      // Extract image
      const imageUrl = await page.$eval(
        'meta[property="og:image"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const images = imageUrl ? [imageUrl] : [];

      // Strategy 1: Check for linked blog URL via rendered <a> tags
      let linkedBlogUrl = await page.$eval(
        'a[data-test-id="pin-action-link"], a[rel="nofollow noopener"]',
        (el) => {
          const href = el.getAttribute("href") ?? "";
          if (href.includes("pinterest.com")) return "";
          return href;
        }
      ).catch(() => "");

      // Strategy 2: Search the full page HTML for source URLs
      if (!linkedBlogUrl) {
        const html = await page.content();
        linkedBlogUrl = extractSourceUrl(html) ?? "";
      }

      return {
        text: [title, description].filter(Boolean).join("\n\n"),
        images,
        videoUrl: null,
        metadata: { platform: "pinterest", originalUrl: url },
        ...(linkedBlogUrl ? { linkedBlogUrl } : {}),
      };
    } finally {
      await page.close();
    }
  },
};

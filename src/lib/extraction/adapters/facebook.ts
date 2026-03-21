// src/lib/extraction/adapters/facebook.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const facebookAdapter: PlatformAdapter = {
  name: "facebook",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Use Facebook's own crawler user agent to get OG meta tags
      // even behind the login wall. Facebook serves these to crawlers
      // for link preview generation.
      await page.setExtraHTTPHeaders({
        "User-Agent":
          "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(2000);

      // Extract from OG meta tags (works even with login wall)
      const title = await page.$eval(
        'meta[property="og:title"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const description = await page.$eval(
        'meta[property="og:description"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const imageUrl = await page.$eval(
        'meta[property="og:image"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const videoUrl = await page.$eval(
        'meta[property="og:video"]',
        (el) => el.getAttribute("content")
      ).catch(() => null);

      const images = imageUrl ? [imageUrl] : [];

      // Clean up title — Facebook OG titles often include "X views · Y reactions | content | Author"
      let cleanText = "";
      if (title) {
        // Extract the actual content from the title pattern
        const parts = title.split("|").map((p) => p.trim());
        // First part is usually "X views · Y reactions", last part is author
        // Middle parts are the actual content
        if (parts.length >= 2) {
          cleanText = parts.slice(1, -1).join(" ").trim() || parts[1] || title;
        } else {
          cleanText = title;
        }
      }

      const text = [cleanText, description].filter(Boolean).join("\n\n");

      if (!text && images.length === 0) {
        throw new Error(
          "Could not extract content from this Facebook post. Try copying the recipe text and using manual entry."
        );
      }

      // Extract author from title (usually last part after |)
      let author = "";
      if (title && title.includes("|")) {
        const parts = title.split("|");
        author = parts[parts.length - 1].trim();
      }

      return {
        text,
        images,
        videoUrl,
        metadata: { author, platform: "facebook", originalUrl: url },
      };
    } finally {
      await page.close();
    }
  },
};

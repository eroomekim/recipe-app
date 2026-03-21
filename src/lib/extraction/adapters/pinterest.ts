// src/lib/extraction/adapters/pinterest.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const pinterestAdapter: PlatformAdapter = {
  name: "pinterest",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
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

      // Check for linked blog URL (many pins link to source)
      const linkedBlogUrl = await page.$eval(
        'a[data-test-id="pin-action-link"], a[rel="nofollow noopener"]',
        (el) => {
          const href = el.getAttribute("href") ?? "";
          // Filter out pinterest internal links
          if (href.includes("pinterest.com")) return "";
          return href;
        }
      ).catch(() => "");

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

// src/lib/extraction/adapters/facebook.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const facebookAdapter: PlatformAdapter = {
  name: "facebook",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(3000);

      // Detect login wall
      const hasLoginWall = await page.$('form[action*="login"]').catch(() => null);
      if (hasLoginWall) {
        throw new Error("This Facebook post requires login. Try copying the recipe text and using manual entry.");
      }

      // Extract from meta tags (most reliable for Facebook)
      const description = await page.$eval(
        'meta[property="og:description"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      const title = await page.$eval(
        'meta[property="og:title"]',
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

      return {
        text: [title, description].filter(Boolean).join("\n\n"),
        images,
        videoUrl,
        metadata: { platform: "facebook", originalUrl: url },
      };
    } finally {
      await page.close();
    }
  },
};

// src/lib/extraction/adapters/instagram.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const instagramAdapter: PlatformAdapter = {
  name: "instagram",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(3000); // Wait for JS rendering

      // Extract caption from meta or DOM
      let caption = await page.$eval(
        'meta[property="og:description"]',
        (el) => el.getAttribute("content") ?? ""
      ).catch(() => "");

      if (!caption) {
        caption = await page.$eval(
          '[data-testid="post-comment-root"] span',
          (el) => el.textContent ?? ""
        ).catch(() => "");
      }

      // Extract images
      const images = await page.$$eval(
        'meta[property="og:image"]',
        (els) => els.map((el) => el.getAttribute("content")).filter(Boolean) as string[]
      ).catch(() => []);

      // Extract video URL
      let videoUrl: string | null = null;
      videoUrl = await page.$eval(
        'meta[property="og:video"]',
        (el) => el.getAttribute("content")
      ).catch(() => null);

      if (!videoUrl) {
        videoUrl = await page.$eval(
          "video source",
          (el) => el.getAttribute("src")
        ).catch(() => null);
      }

      const author = await page.$eval(
        'meta[property="og:title"]',
        (el) => {
          const content = el.getAttribute("content") ?? "";
          const match = content.match(/^(.+?)\s+on\s+Instagram/i);
          return match ? match[1] : "";
        }
      ).catch(() => "");

      return {
        text: caption,
        images,
        videoUrl,
        metadata: { author, platform: "instagram", originalUrl: url },
      };
    } finally {
      await page.close();
    }
  },
};

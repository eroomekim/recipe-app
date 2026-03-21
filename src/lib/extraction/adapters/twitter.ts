// src/lib/extraction/adapters/twitter.ts
import { getBrowser } from "../browser";
import type { PlatformAdapter, PlatformContent } from "../types";

export const twitterAdapter: PlatformAdapter = {
  name: "twitter",

  async extract(url: string): Promise<PlatformContent> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(5000); // Twitter is slow to render

      // Extract tweet text
      const tweetTexts = await page.$$eval(
        '[data-testid="tweetText"]',
        (els) => els.slice(0, 10).map((el) => el.textContent ?? "").filter(Boolean)
      ).catch(() => []);

      const text = tweetTexts.join("\n\n");

      // Extract images
      const images = await page.$$eval(
        'img[src*="pbs.twimg.com/media"]',
        (els) => els.map((el) => el.getAttribute("src")).filter(Boolean) as string[]
      ).catch(() => []);

      // Extract video URL from og:video
      const videoUrl = await page.$eval(
        'meta[property="og:video:url"]',
        (el) => el.getAttribute("content")
      ).catch(() => null);

      const author = await page.$eval(
        '[data-testid="User-Name"] a',
        (el) => el.textContent ?? ""
      ).catch(() => "");

      return {
        text,
        images,
        videoUrl,
        metadata: { author, platform: "twitter", originalUrl: url },
      };
    } finally {
      await page.close();
    }
  },
};

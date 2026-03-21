// src/lib/extraction/browser.ts
import { chromium, type Browser } from "playwright";

let browser: Browser | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  }, IDLE_TIMEOUT_MS);
}

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  resetIdleTimer();
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (idleTimer) clearTimeout(idleTimer);
  if (browser) {
    await browser.close();
    browser = null;
  }
}

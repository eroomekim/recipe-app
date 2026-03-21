// src/lib/extraction/platform-detector.ts
export type Platform = "youtube" | "instagram" | "twitter" | "pinterest" | "facebook" | "blog";

const PLATFORM_PATTERNS: { platform: Platform; hostnames: string[] }[] = [
  { platform: "youtube", hostnames: ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"] },
  { platform: "instagram", hostnames: ["instagram.com", "www.instagram.com"] },
  { platform: "twitter", hostnames: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"] },
  { platform: "pinterest", hostnames: ["pinterest.com", "www.pinterest.com", "pin.it"] },
  { platform: "facebook", hostnames: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com", "m.facebook.com"] },
];

export function detectPlatform(url: string): Platform {
  try {
    const { hostname } = new URL(url);
    for (const { platform, hostnames } of PLATFORM_PATTERNS) {
      if (hostnames.includes(hostname)) return platform;
    }
  } catch {
    // Invalid URL
  }
  return "blog";
}

export function isSocialMedia(platform: Platform): boolean {
  return platform !== "blog";
}

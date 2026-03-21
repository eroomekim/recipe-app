// src/lib/extraction/platform-detector.test.ts
import { describe, it, expect } from "vitest";
import { detectPlatform } from "./platform-detector";

describe("detectPlatform", () => {
  it("detects YouTube URLs", () => {
    expect(detectPlatform("https://www.youtube.com/watch?v=abc123")).toBe("youtube");
    expect(detectPlatform("https://youtu.be/abc123")).toBe("youtube");
  });

  it("detects Instagram URLs", () => {
    expect(detectPlatform("https://www.instagram.com/p/abc123/")).toBe("instagram");
    expect(detectPlatform("https://instagram.com/reel/abc123/")).toBe("instagram");
  });

  it("detects Twitter/X URLs", () => {
    expect(detectPlatform("https://twitter.com/user/status/123")).toBe("twitter");
    expect(detectPlatform("https://x.com/user/status/123")).toBe("twitter");
  });

  it("detects Pinterest URLs", () => {
    expect(detectPlatform("https://www.pinterest.com/pin/123/")).toBe("pinterest");
    expect(detectPlatform("https://pin.it/abc123")).toBe("pinterest");
  });

  it("detects Facebook URLs", () => {
    expect(detectPlatform("https://www.facebook.com/user/posts/123")).toBe("facebook");
    expect(detectPlatform("https://fb.com/story/123")).toBe("facebook");
  });

  it("returns blog for unknown URLs", () => {
    expect(detectPlatform("https://seriouseats.com/recipe")).toBe("blog");
    expect(detectPlatform("https://example.com/my-recipe")).toBe("blog");
  });
});

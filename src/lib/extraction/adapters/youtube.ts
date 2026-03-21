// src/lib/extraction/adapters/youtube.ts
import { YoutubeTranscript } from "youtube-transcript";
import type { PlatformAdapter, PlatformContent } from "../types";

/**
 * Extract video ID from various YouTube URL formats:
 * - youtube.com/watch?v=ID
 * - youtu.be/ID
 * - youtube.com/shorts/ID
 * - youtube.com/embed/ID
 */
function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    // youtube.com/shorts/ID or youtube.com/embed/ID
    const pathMatch = parsed.pathname.match(/^\/(shorts|embed)\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[2];

    // youtube.com/watch?v=ID
    const vParam = parsed.searchParams.get("v");
    if (vParam) return vParam;

    // youtu.be/ID
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Convert any YouTube URL to the standard watch format for transcript fetching.
 */
function toWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export const youtubeAdapter: PlatformAdapter = {
  name: "youtube",

  async extract(url: string): Promise<PlatformContent> {
    const videoId = extractVideoId(url);
    const watchUrl = videoId ? toWatchUrl(videoId) : url;

    // Fetch transcript (free, no API key needed)
    let transcriptText = "";
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(watchUrl);
      transcriptText = transcript.map((t) => t.text).join(" ");
    } catch {
      // Transcript not available (disabled, live video, Shorts without captions, etc.)
    }

    // Fetch page metadata via oEmbed (free, no key needed)
    let title = "";
    let author = "";
    let thumbnailUrl = "";
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const data = await res.json();
        title = data.title ?? "";
        author = data.author_name ?? "";
        thumbnailUrl = data.thumbnail_url ?? "";
      }
    } catch {
      // oEmbed failed
    }

    // Fetch page for description via meta tags
    let description = "";
    try {
      const res = await fetch(watchUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBook/1.0)" },
        signal: AbortSignal.timeout(10_000),
      });
      const html = await res.text();
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*?)"/i);
      if (descMatch) description = descMatch[1];
    } catch {
      // Page fetch failed
    }

    const text = [title, description, transcriptText].filter(Boolean).join("\n\n");
    const images = thumbnailUrl ? [thumbnailUrl] : [];

    // If no transcript available, provide the video URL for Whisper fallback
    const needsWhisper = !transcriptText && videoId;
    const videoDownloadUrl = needsWhisper
      ? `https://www.youtube.com/watch?v=${videoId}`
      : null;

    return {
      text,
      images,
      videoUrl: videoDownloadUrl,
      metadata: {
        author,
        platform: "youtube",
        originalUrl: url,
      },
    };
  },
};

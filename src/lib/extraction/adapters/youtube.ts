// src/lib/extraction/adapters/youtube.ts
import { YoutubeTranscript } from "youtube-transcript";
import type { PlatformAdapter, PlatformContent } from "../types";

export const youtubeAdapter: PlatformAdapter = {
  name: "youtube",

  async extract(url: string): Promise<PlatformContent> {
    // Fetch transcript (free, no API key needed)
    let transcriptText = "";
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      transcriptText = transcript.map((t) => t.text).join(" ");
    } catch {
      // Transcript not available (disabled, live video, etc.)
    }

    // Fetch page metadata via oEmbed (free, no key needed)
    let title = "";
    let author = "";
    let thumbnailUrl = "";
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
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
      const res = await fetch(url, {
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

    return {
      text,
      images,
      videoUrl: null, // YouTube transcripts don't need video download
      metadata: {
        author,
        platform: "youtube",
        originalUrl: url,
      },
    };
  },
};

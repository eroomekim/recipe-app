// src/lib/extraction/video-downloader.ts
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export interface DownloadResult {
  filePath: string;
  cleanup: () => Promise<void>;
}

/**
 * Download a video URL to a temp file.
 * Returns the file path and a cleanup function.
 * Throws if download fails or file is too large.
 */
export async function downloadVideo(
  videoUrl: string,
  jobId: string
): Promise<DownloadResult> {
  const filePath = join(tmpdir(), `recipe-video-${jobId}.mp4`);

  const res = await fetch(videoUrl, {
    signal: AbortSignal.timeout(60_000), // 60s timeout for download
  });

  if (!res.ok) {
    throw new Error(`Video download failed: HTTP ${res.status}`);
  }

  const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error("Video file too large (max 100MB)");
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("Video file too large (max 100MB)");
  }

  await writeFile(filePath, buffer);

  return {
    filePath,
    cleanup: async () => {
      try { await unlink(filePath); } catch { /* ignore */ }
    },
  };
}

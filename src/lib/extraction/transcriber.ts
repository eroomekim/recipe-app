// src/lib/extraction/transcriber.ts
import { readFile } from "fs/promises";
import type { TranscriptionProvider } from "./types";

export class WhisperTranscriber implements TranscriptionProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    const blob = new Blob([fileBuffer], { type: "audio/mp4" });

    const form = new FormData();
    form.append("file", blob, "video.mp4");
    form.append("model", "whisper-1");
    form.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(120_000), // 2 min timeout for transcription
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`Whisper API error (${res.status}): ${errText}`);
    }

    return await res.text();
  }
}

/**
 * Get a transcriber instance, or null if no API key is configured.
 */
export function getTranscriber(): TranscriptionProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new WhisperTranscriber(apiKey);
}

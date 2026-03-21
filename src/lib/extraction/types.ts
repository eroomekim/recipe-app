// src/lib/extraction/types.ts
import type { ExtractedRecipe } from "@/types";

export interface PlatformContent {
  text: string;
  images: string[];
  videoUrl: string | null;
  metadata: {
    author?: string;
    platform: string;
    originalUrl: string;
  };
  linkedBlogUrl?: string; // Pinterest: link to original blog
}

export interface PlatformAdapter {
  name: string;
  extract(url: string): Promise<PlatformContent>;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type JobStage = "detecting" | "fetching" | "downloading" | "transcribing" | "extracting" | "complete";

export interface ExtractionJob {
  id: string;
  userId: string;
  url: string;
  status: JobStatus;
  stage: JobStage | null;
  result: ExtractedRecipe | null;
  error: string | null;
  platform: string | null;
  linkedBlogUrl: string | null;
  createdAt: number;
}

export interface StructuringInput {
  text: string;
  images: string[];
  platform: string;
  originalUrl: string;
}

export interface TranscriptionProvider {
  transcribe(filePath: string): Promise<string>;
}

export interface RecipeStructurerInterface {
  structure(content: StructuringInput): Promise<ExtractedRecipe>;
}

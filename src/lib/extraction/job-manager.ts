// src/lib/extraction/job-manager.ts
import { createId } from "@paralleldrive/cuid2";
import type { ExtractedRecipe } from "@/types";
import type { ExtractionJob, JobStatus, JobStage } from "./types";

const jobs = new Map<string, ExtractionJob>();

const JOB_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
const JOB_CLEANUP_MS = 30 * 60 * 1000; // 30 minutes

// Cleanup interval — runs every 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, job] of jobs) {
        // Timeout processing jobs
        if (job.status === "processing" && now - job.createdAt > JOB_TIMEOUT_MS) {
          job.status = "failed";
          job.error = "Extraction timed out.";
        }
        // Remove old jobs
        if (now - job.createdAt > JOB_CLEANUP_MS) {
          jobs.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }
}

export const jobManager = {
  create(userId: string, url: string): ExtractionJob {
    ensureCleanup();
    const job: ExtractionJob = {
      id: createId(),
      userId,
      url,
      status: "pending",
      stage: null,
      result: null,
      error: null,
      platform: null,
      linkedBlogUrl: null,
      createdAt: Date.now(),
    };
    jobs.set(job.id, job);
    return job;
  },

  get(id: string): ExtractionJob | null {
    return jobs.get(id) ?? null;
  },

  updateStage(id: string, status: JobStatus, stage: JobStage) {
    const job = jobs.get(id);
    if (job) {
      job.status = status;
      job.stage = stage;
    }
  },

  complete(id: string, result: ExtractedRecipe, platform: string, linkedBlogUrl?: string) {
    const job = jobs.get(id);
    if (job) {
      job.status = "completed";
      job.stage = "complete";
      job.result = result;
      job.platform = platform;
      job.linkedBlogUrl = linkedBlogUrl ?? null;
    }
  },

  fail(id: string, error: string) {
    const job = jobs.get(id);
    if (job) {
      job.status = "failed";
      job.error = error;
    }
  },

  clear() {
    jobs.clear();
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  },
};

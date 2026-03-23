// src/lib/extraction/job-manager.ts
import { createId } from "@paralleldrive/cuid2";
import type { ExtractedRecipe } from "@/types";
import type { ExtractionJob, JobStatus, JobStage } from "./types";

const jobs = new Map<string, ExtractionJob>();

const JOB_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
const JOB_CLEANUP_MS = 10 * 60 * 1000;  // 10 minutes (was 30)
const MAX_JOBS = 200;

// Cleanup interval — runs every 2 minutes
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
        // Remove old completed/failed jobs
        if (
          now - job.createdAt > JOB_CLEANUP_MS ||
          (job.status !== "processing" && job.status !== "pending" && now - job.createdAt > JOB_CLEANUP_MS / 2)
        ) {
          jobs.delete(id);
        }
      }

      // Stop the interval if no jobs remain
      if (jobs.size === 0 && cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    }, 2 * 60 * 1000);
  }
}

function evictOldest() {
  if (jobs.size < MAX_JOBS) return;
  let oldestId: string | null = null;
  let oldestTime = Infinity;
  for (const [id, job] of jobs) {
    if (job.status !== "processing" && job.createdAt < oldestTime) {
      oldestTime = job.createdAt;
      oldestId = id;
    }
  }
  if (oldestId) jobs.delete(oldestId);
}

export const jobManager = {
  create(userId: string, url: string): ExtractionJob {
    ensureCleanup();
    evictOldest();
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

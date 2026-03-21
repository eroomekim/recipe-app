// src/lib/extraction/job-manager.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { jobManager } from "./job-manager";

beforeEach(() => {
  jobManager.clear();
});

describe("jobManager", () => {
  it("creates a job with pending status", () => {
    const job = jobManager.create("user1", "https://youtube.com/watch?v=abc");
    expect(job.status).toBe("pending");
    expect(job.userId).toBe("user1");
    expect(job.id).toBeTruthy();
  });

  it("retrieves a job by id", () => {
    const created = jobManager.create("user1", "https://example.com");
    const retrieved = jobManager.get(created.id);
    expect(retrieved).toEqual(created);
  });

  it("returns null for nonexistent job", () => {
    expect(jobManager.get("nonexistent")).toBeNull();
  });

  it("updates job status and stage", () => {
    const job = jobManager.create("user1", "https://example.com");
    jobManager.updateStage(job.id, "processing", "fetching");
    const updated = jobManager.get(job.id);
    expect(updated?.status).toBe("processing");
    expect(updated?.stage).toBe("fetching");
  });

  it("completes a job with result", () => {
    const job = jobManager.create("user1", "https://example.com");
    const mockRecipe = { title: "Test" } as any;
    jobManager.complete(job.id, mockRecipe, "youtube");
    const completed = jobManager.get(job.id);
    expect(completed?.status).toBe("completed");
    expect(completed?.result?.title).toBe("Test");
  });

  it("fails a job with error", () => {
    const job = jobManager.create("user1", "https://example.com");
    jobManager.fail(job.id, "Something went wrong");
    const failed = jobManager.get(job.id);
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("Something went wrong");
  });
});

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobManager } from "@/lib/extraction/job-manager";
import type { JobPollResponse } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = jobManager.get(jobId);
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const response: JobPollResponse = {
    status: job.status,
    stage: job.stage,
    recipe: job.result,
    sourceUrl: job.status === "completed" ? job.url : null,
    _meta: job.status === "completed" && job.platform
      ? { method: "social-media", platform: job.platform }
      : null,
    error: job.error,
    linkedBlogUrl: job.linkedBlogUrl,
  };

  return NextResponse.json(response);
}

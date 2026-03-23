import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const DAILY_LIMIT = parseInt(process.env.RATE_LIMIT_DAILY ?? "20", 10);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const logs = await prisma.extractionLog.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay },
    },
    select: { type: true, status: true },
  });

  const blogCount = logs.filter((l) => l.type === "blog").length;
  const socialCount = logs.filter((l) => l.type === "social").length;
  const totalCount = logs.length;

  return NextResponse.json({
    dailyLimit: DAILY_LIMIT,
    totalUsed: totalCount,
    blogUsed: blogCount,
    socialUsed: socialCount,
    remaining: Math.max(0, DAILY_LIMIT - totalCount),
  });
}

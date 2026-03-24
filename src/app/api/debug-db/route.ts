import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "NOT SET";
  // Only show host portion, not password
  const safeUrl = dbUrl.replace(/\/\/[^@]+@/, "//***@");

  try {
    const count = await prisma.user.count();
    return NextResponse.json({ status: "ok", userCount: count, dbUrl: safeUrl });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      dbUrl: safeUrl,
    });
  }
}

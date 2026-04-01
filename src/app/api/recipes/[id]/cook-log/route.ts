import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entries = await prisma.cookLog.findMany({
    where: { recipeId: id, userId: user.id },
    orderBy: { cookedAt: "desc" },
  });

  return NextResponse.json({
    totalCooks: entries.length,
    lastCookedAt: entries[0]?.cookedAt ?? null,
    entries: entries.map((e) => ({
      id: e.id,
      note: e.note,
      cookedAt: e.cookedAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!recipe || recipe.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  const entry = await prisma.cookLog.create({
    data: {
      recipeId: id,
      userId: user.id,
      note: body.note?.trim() || null,
    },
  });

  return NextResponse.json({
    id: entry.id,
    note: entry.note,
    cookedAt: entry.cookedAt.toISOString(),
  }, { status: 201 });
}

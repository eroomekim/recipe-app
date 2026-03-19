import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { userId: true },
  });
  if (!collection || collection.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { recipeId } = await request.json();
  if (!recipeId) return NextResponse.json({ error: "recipeId required" }, { status: 400 });

  await prisma.recipeCollection.upsert({
    where: { recipeId_collectionId: { recipeId, collectionId } },
    create: { recipeId, collectionId },
    update: {},
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipeId } = await request.json();

  await prisma.recipeCollection.deleteMany({
    where: { recipeId, collectionId },
  });

  return new NextResponse(null, { status: 204 });
}

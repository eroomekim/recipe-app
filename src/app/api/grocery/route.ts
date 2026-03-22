import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.groceryItem.findMany({
    where: { userId: user.id },
    orderBy: [{ checked: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Support adding multiple items at once (from a recipe)
  if (Array.isArray(body.items)) {
    const created = await prisma.groceryItem.createMany({
      data: body.items.map((item: { text: string; recipeId?: string; recipeTitle?: string }) => ({
        userId: user.id,
        text: item.text,
        recipeId: item.recipeId ?? null,
        recipeTitle: item.recipeTitle ?? null,
      })),
    });
    return NextResponse.json({ count: created.count }, { status: 201 });
  }

  // Single item
  const item = await prisma.groceryItem.create({
    data: {
      userId: user.id,
      text: body.text,
      recipeId: body.recipeId ?? null,
      recipeTitle: body.recipeTitle ?? null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Toggle checked state
  if (body.id && body.checked !== undefined) {
    const item = await prisma.groceryItem.findUnique({ where: { id: body.id } });
    if (!item || item.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await prisma.groceryItem.update({
      where: { id: body.id },
      data: { checked: body.checked },
    });
    return NextResponse.json(updated);
  }

  // Clear all checked items
  if (body.clearChecked) {
    await prisma.groceryItem.deleteMany({
      where: { userId: user.id, checked: true },
    });
    return NextResponse.json({ ok: true });
  }

  // Clear all items
  if (body.clearAll) {
    await prisma.groceryItem.deleteMany({
      where: { userId: user.id },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const item = await prisma.groceryItem.findUnique({ where: { id: body.id } });
  if (!item || item.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.groceryItem.delete({ where: { id: body.id } });
  return new NextResponse(null, { status: 204 });
}

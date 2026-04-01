import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (!settings) {
    return NextResponse.json({
      measurementSystem: "imperial",
      maxDisplayImages: 8,
      defaultServings: null,
      cookingAutoReadAloud: false,
      cookingKeepAwake: true,
      altitude: null,
      equipment: [],
      theme: "system",
    });
  }

  return NextResponse.json({
    measurementSystem: settings.measurementSystem,
    maxDisplayImages: settings.maxDisplayImages,
    defaultServings: settings.defaultServings,
    cookingAutoReadAloud: settings.cookingAutoReadAloud,
    cookingKeepAwake: settings.cookingKeepAwake,
    altitude: settings.altitude,
    equipment: settings.equipment,
    theme: settings.theme,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      measurementSystem: body.measurementSystem,
      maxDisplayImages: body.maxDisplayImages,
      defaultServings: body.defaultServings,
      cookingAutoReadAloud: body.cookingAutoReadAloud,
      cookingKeepAwake: body.cookingKeepAwake,
      altitude: body.altitude,
      equipment: body.equipment,
      theme: body.theme,
    },
    create: {
      userId: user.id,
      measurementSystem: body.measurementSystem ?? "imperial",
      maxDisplayImages: body.maxDisplayImages ?? 8,
      defaultServings: body.defaultServings ?? null,
      cookingAutoReadAloud: body.cookingAutoReadAloud ?? false,
      cookingKeepAwake: body.cookingKeepAwake ?? true,
      altitude: body.altitude ?? null,
      equipment: body.equipment ?? [],
      theme: body.theme ?? "system",
    },
  });

  return NextResponse.json({
    measurementSystem: settings.measurementSystem,
    maxDisplayImages: settings.maxDisplayImages,
    defaultServings: settings.defaultServings,
    cookingAutoReadAloud: settings.cookingAutoReadAloud,
    cookingKeepAwake: settings.cookingKeepAwake,
    altitude: settings.altitude,
    equipment: settings.equipment,
    theme: settings.theme,
  });
}

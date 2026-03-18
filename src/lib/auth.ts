import { prisma } from "@/lib/prisma";
import type { User } from "@supabase/supabase-js";

export async function ensureUser(supabaseUser: User) {
  return prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      email: supabaseUser.email!,
    },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: supabaseUser.user_metadata?.full_name ?? null,
    },
  });
}

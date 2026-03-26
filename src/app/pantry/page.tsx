import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PantrySearch from "@/components/pantry/PantrySearch";

export default async function PantryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all unique ingredient names from user's recipes for autocomplete
  const ingredients = await prisma.ingredient.findMany({
    where: { recipe: { userId: user.id }, name: { not: null } },
    select: { name: true },
    distinct: ["name"],
  });

  const knownIngredients = ingredients
    .map((i) => i.name!)
    .sort();

  return (
    <main className="max-w-article mx-auto px-6 py-12">
      <h1 className="font-display text-3xl sm:text-4xl font-bold leading-none mb-2">
        What Can I Cook?
      </h1>
      <p className="font-serif text-lg text-gray-600 italic mb-8">
        Enter the ingredients you have on hand.
      </p>
      <PantrySearch knownIngredients={knownIngredients} />
    </main>
  );
}

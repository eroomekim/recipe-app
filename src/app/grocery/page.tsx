import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GroceryList from "@/components/grocery/GroceryList";

export default async function GroceryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="max-w-article mx-auto px-4 py-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold leading-none text-center mb-8">
        Grocery List
      </h1>
      <GroceryList />
    </main>
  );
}

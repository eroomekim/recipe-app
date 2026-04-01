import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/recipes");

  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-4">
      <h1 className="font-display text-5xl font-black leading-none text-center">
        Recipe Book
      </h1>
      <p className="font-serif text-lg italic text-gray-600 mt-4 text-center max-w-md">
        Import recipes from your favorite food blogs. AI extracts the details.
        You build the collection.
      </p>
      <div className="flex gap-4 mt-8">
        <Link
          href="/signup"
          className="bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors"
        >
          Register
        </Link>
        <Link
          href="/login"
          className="bg-white text-black font-sans text-base font-semibold px-8 py-3 border border-black hover:bg-gray-50 transition-colors"
        >
          Login
        </Link>
      </div>
    </main>
  );
}

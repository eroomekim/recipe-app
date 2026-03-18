"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/recipes");
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <h1 className="font-display text-3xl font-bold leading-none text-center mb-8">
        Sign In
      </h1>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full border border-gray-300 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        <div>
          <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="w-full border border-gray-300 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        {error && (
          <p className="font-sans text-sm text-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <hr className="flex-1 border-t border-gray-300" />
        <span className="font-sans text-xs text-gray-500 uppercase tracking-wider">
          or
        </span>
        <hr className="flex-1 border-t border-gray-300" />
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full bg-white text-black font-sans text-base font-semibold px-8 py-3 border border-black hover:bg-gray-50 transition-colors"
      >
        Sign in with Google
      </button>

      <p className="mt-6 text-center font-sans text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-black underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

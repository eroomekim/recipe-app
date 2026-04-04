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

  async function handleOAuthLogin(provider: "google" | "apple" | "facebook") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
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
          <label
            htmlFor="login-email"
            className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            spellCheck={false}
            required
            className="w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
            className="w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors"
          />
        </div>

        {error && (
          <p className="font-sans text-sm text-red-dark">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-sans text-base font-semibold px-8 py-3 hover:bg-gray-900 transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 border-t border-gray-300" />
        <span className="font-sans text-xs text-gray-600 uppercase tracking-wider">
          or
        </span>
        <div className="flex-1 border-t border-gray-300" />
      </div>

      <button
        onClick={() => handleOAuthLogin("google")}
        className="w-full bg-white text-black font-sans text-base font-semibold px-8 py-3 border border-black hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      <p className="mt-6 text-center font-sans text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-black underline">
          Register
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import MobileMenu from "./MobileMenu";

interface NavbarProps {
  user: { email: string } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          {/* Mobile: hamburger */}
          {user && (
            <button
              className="md:hidden font-sans text-base"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {/* Logo */}
          <Link
            href={user ? "/recipes" : "/"}
            className="font-display text-xl font-bold leading-none md:absolute md:left-1/2 md:-translate-x-1/2"
          >
            Recipe Book
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/recipes"
                className="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
              >
                Recipes
              </Link>
              <Link
                href="/import"
                className="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
              >
                Import
              </Link>
              <Link
                href="/grocery"
                className="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
              >
                Grocery
              </Link>
            </div>
          )}

          {/* Right side */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline font-sans text-xs text-gray-600">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="hidden md:inline font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 hover:text-black transition-colors"
              >
                Sign Out
              </button>
              {/* Mobile: user initial */}
              <span className="md:hidden w-8 h-8 bg-gray-50 text-gray-900 font-sans text-xs font-semibold flex items-center justify-center">
                {initial}
              </span>
            </div>
          ) : (
            <Link
              href="/login"
              className="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {user && (
        <MobileMenu
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}

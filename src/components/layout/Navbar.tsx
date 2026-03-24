"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Menu, Settings, HelpCircle, LogOut } from "lucide-react";
import MobileMenu from "./MobileMenu";

interface NavbarProps {
  user: { email: string } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = user?.email?.charAt(0).toUpperCase() ?? "?";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

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

          {/* Desktop nav links — left side */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/recipes"
                className="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
              >
                Recipes
              </Link>
              <Link
                href="/grocery"
                className="font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
              >
                Groceries
              </Link>
            </div>
          )}

          {/* Logo — centered */}
          <Link
            href={user ? "/recipes" : "/"}
            className="font-display text-xl font-bold leading-none md:absolute md:left-1/2 md:-translate-x-1/2"
          >
            Recipe Book
          </Link>

          {/* Right side — import link + avatar with dropdown */}
          {user ? (
            <div className="flex items-center gap-5">
              <Link
                href="/import"
                className="hidden md:block font-sans text-base font-bold uppercase tracking-normal text-gray-900 hover:text-black transition-colors"
              >
                Import
              </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-8 h-8 bg-gray-900 text-white font-sans text-xs font-semibold flex items-center justify-center rounded-full hover:bg-black transition-colors"
                aria-label="User menu"
              >
                {initial}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 py-1 min-w-[180px] z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <span className="font-sans text-xs text-gray-500 block truncate">
                      {user.email}
                    </span>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    Settings
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-gray-500" />
                    Help
                  </Link>
                  <div className="border-t border-gray-200 my-1" />
                  <button
                    onClick={() => { setDropdownOpen(false); handleSignOut(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 font-sans text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-gray-500" />
                    Log out
                  </button>
                </div>
              )}
            </div>
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

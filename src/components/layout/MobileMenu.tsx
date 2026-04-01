"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export default function MobileMenu({
  open,
  onClose,
  onSignOut,
}: MobileMenuProps) {
  // Track whether the component should be in the DOM
  const [mounted, setMounted] = useState(false);
  // Track whether the animation classes are active
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Trigger animation on next frame so the initial state renders first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      // Wait for animation to finish before unmounting
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-64 bg-white p-6 flex flex-col gap-6 transition-transform duration-300 ease-out-expo ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={onClose}
          className="self-end font-sans text-base text-gray-600"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>

        <nav className="flex flex-col gap-4">
          <Link
            href="/recipes"
            onClick={onClose}
            className="font-sans text-base font-bold uppercase tracking-normal text-gray-900"
          >
            Recipes
          </Link>
          <Link
            href="/import"
            onClick={onClose}
            className="font-sans text-base font-bold uppercase tracking-normal text-gray-900"
          >
            Import
          </Link>
          <Link
            href="/grocery"
            onClick={onClose}
            className="font-sans text-base font-bold uppercase tracking-normal text-gray-900"
          >
            Grocery List
          </Link>
          <Link
            href="/pantry"
            onClick={onClose}
            className="font-sans text-base font-bold uppercase tracking-normal text-gray-900"
          >
            Pantry
          </Link>
        </nav>

        <hr className="border-t border-gray-300" />

        <Link
          href="/settings"
          onClick={onClose}
          className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600"
        >
          Settings
        </Link>

        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 text-left"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

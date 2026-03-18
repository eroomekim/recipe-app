"use client";

import Link from "next/link";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-6 flex flex-col gap-6">
        <button
          onClick={onClose}
          className="self-end font-sans text-base text-gray-600"
          aria-label="Close menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
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
        </nav>

        <hr className="border-t border-gray-300" />

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

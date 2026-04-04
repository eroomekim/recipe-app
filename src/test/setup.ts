import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Reset shared navigation state between tests (stored on globalThis so the
  // hoisted vi.mock factory can reference it without a TDZ error).
  (globalThis as Record<string, unknown>).__navSearch = "";
  ((globalThis as Record<string, unknown>).__navListeners as Set<() => void>).clear();
});

// Mock next/navigation with a reactive searchParams store so that components
// using useSearchParams + router.replace behave correctly in tests.
// State lives on globalThis so the hoisted factory can access it.
(globalThis as Record<string, unknown>).__navSearch = "";
(globalThis as Record<string, unknown>).__navListeners = new Set<() => void>();

vi.mock("next/navigation", async () => {
  const { useState, useEffect } = await import("react");

  const g = globalThis as Record<string, unknown>;

  const useSearchParams = () => {
    const [, forceUpdate] = useState(0);
    useEffect(() => {
      const notify = () => forceUpdate((n) => n + 1);
      (g.__navListeners as Set<() => void>).add(notify);
      return () => { (g.__navListeners as Set<() => void>).delete(notify); };
    }, []);
    return new URLSearchParams(g.__navSearch as string);
  };

  const useRouter = () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    replace: vi.fn().mockImplementation((url: string) => {
      const qIndex = url.indexOf("?");
      g.__navSearch = qIndex !== -1 ? url.slice(qIndex + 1) : "";
      (g.__navListeners as Set<() => void>).forEach((fn) => fn());
    }),
  });

  const usePathname = () => "/recipes";

  return {
    useRouter,
    usePathname,
    useSearchParams,
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
});

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => {
    const React = require("react");
    return React.createElement("a", { href, ...props }, children);
  },
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

// Mock apiUrl to return paths as-is
vi.mock("@/lib/api", () => ({
  apiUrl: (path: string) => path,
}));

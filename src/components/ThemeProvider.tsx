"use client";

import { useEffect, useCallback } from "react";
import { useSettings } from "@/hooks/useSettings";

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#000000" : "#FFFFFF");
  localStorage.setItem("theme-resolved", dark ? "dark" : "light");
}

function resolveTheme(theme: string): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function ThemeProvider() {
  const { settings, loading } = useSettings();

  const applyCurrentTheme = useCallback(() => {
    const theme = settings.theme;
    applyTheme(resolveTheme(theme));
  }, [settings.theme]);

  // Apply theme when settings load or change
  useEffect(() => {
    if (loading) return;
    applyCurrentTheme();

    // Listen for OS preference changes when in system mode
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme(mq.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme, loading, applyCurrentTheme]);

  // Listen for theme changes from other components via storage event
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === "theme-setting" && e.newValue) {
        applyTheme(resolveTheme(e.newValue));
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}

/**
 * Call this from settings page to immediately apply theme
 * without waiting for ThemeProvider to re-render.
 */
export function applyThemeImmediate(theme: "system" | "light" | "dark") {
  applyTheme(resolveTheme(theme));
  localStorage.setItem("theme-setting", theme);
}

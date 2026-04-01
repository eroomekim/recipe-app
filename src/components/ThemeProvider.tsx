"use client";

import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

export default function ThemeProvider() {
  const { settings, loading } = useSettings();

  useEffect(() => {
    if (loading) return;

    const theme = settings.theme;

    function applyTheme(dark: boolean) {
      if (dark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      // Update theme-color meta tag
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", dark ? "#000000" : "#FFFFFF");
      // Cache for flash prevention
      localStorage.setItem("theme-resolved", dark ? "dark" : "light");
    }

    if (theme === "dark") {
      applyTheme(true);
      return;
    }

    if (theme === "light") {
      applyTheme(false);
      return;
    }

    // System: follow OS preference
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    applyTheme(mq.matches);

    function handleChange(e: MediaQueryListEvent) {
      applyTheme(e.matches);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [settings.theme, loading]);

  return null;
}

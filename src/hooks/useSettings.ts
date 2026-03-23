"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserSettingsData } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

export function useSettings() {
  const [settings, setSettings] = useState<UserSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = useCallback(async (patch: Partial<UserSettingsData>) => {
    const next = { ...settings, ...patch };
    setSettings(next);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }, [settings]);

  return { settings, loading, update };
}

"use client";

import { useState, useEffect, useCallback } from "react";

export function useWakeLock() {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        const lock = await navigator.wakeLock.request("screen");
        setWakeLock(lock);
        setIsActive(true);

        lock.addEventListener("release", () => {
          setIsActive(false);
          setWakeLock(null);
        });
      }
    } catch {
      // Wake lock request failed (e.g., low battery, tab not visible)
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setIsActive(false);
    }
  }, [wakeLock]);

  // Re-acquire on visibility change (wake lock releases when tab goes background)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && isActive) {
        request();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isActive, request]);

  return { isActive, request, release };
}

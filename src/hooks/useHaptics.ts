"use client";

import { useCallback } from "react";

type HapticStyle = "light" | "medium" | "heavy";

/**
 * Haptic feedback hook.
 * Uses Capacitor Haptics plugin when available, no-ops on web.
 */
export function useHaptics() {
  const impact = useCallback(async (style: HapticStyle = "light") => {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      const styleMap: Record<HapticStyle, typeof ImpactStyle[keyof typeof ImpactStyle]> = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[style] });
    } catch {
      // Not on Capacitor — no-op
    }
  }, []);

  return { impact };
}

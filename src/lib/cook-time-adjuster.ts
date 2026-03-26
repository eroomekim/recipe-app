import type { AltitudeSetting, EquipmentType, CookTimeAdjustment } from "@/types";

interface AdjustmentRule {
  timeMultiplier: number;
  label: string;
}

const EQUIPMENT_ADJUSTMENTS: Record<EquipmentType, AdjustmentRule> = {
  convection_oven: { timeMultiplier: 0.85, label: "Convection Oven" },
  air_fryer: { timeMultiplier: 0.80, label: "Air Fryer" },
  instant_pot: { timeMultiplier: 0.40, label: "Instant Pot" },
  slow_cooker: { timeMultiplier: 4.0, label: "Slow Cooker" },
};

const ALTITUDE_ADJUSTMENTS: Record<AltitudeSetting, AdjustmentRule> = {
  sea_level: { timeMultiplier: 1.0, label: "Sea Level" },
  moderate: { timeMultiplier: 1.0, label: "Moderate Altitude" },
  high: { timeMultiplier: 1.10, label: "High Altitude" },
  very_high: { timeMultiplier: 1.20, label: "Very High Altitude" },
};

export const EQUIPMENT_OPTIONS: { key: EquipmentType; label: string }[] = [
  { key: "convection_oven", label: "Convection Oven" },
  { key: "air_fryer", label: "Air Fryer" },
  { key: "instant_pot", label: "Instant Pot" },
  { key: "slow_cooker", label: "Slow Cooker" },
];

/**
 * Compute an adjusted cook time based on equipment and altitude.
 * Returns null if no adjustments apply.
 */
export function adjustCookTime(
  originalMinutes: number,
  equipment: EquipmentType | null,
  altitude: AltitudeSetting | null,
): CookTimeAdjustment | null {
  let multiplier = 1.0;
  const labels: string[] = [];

  if (equipment) {
    const rule = EQUIPMENT_ADJUSTMENTS[equipment];
    multiplier *= rule.timeMultiplier;
    labels.push(rule.label);
  }

  if (altitude && altitude !== "sea_level" && altitude !== "moderate") {
    const rule = ALTITUDE_ADJUSTMENTS[altitude];
    multiplier *= rule.timeMultiplier;
    labels.push(rule.label);
  }

  if (multiplier === 1.0) return null;

  return {
    originalMinutes,
    adjustedMinutes: Math.round(originalMinutes * multiplier),
    label: labels.join(" + "),
  };
}

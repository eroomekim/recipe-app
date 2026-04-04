"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { adjustCookTime, EQUIPMENT_OPTIONS } from "@/lib/cook-time-adjuster";
import { useSettings } from "@/hooks/useSettings";
import type { EquipmentType, CookTimeAdjustment } from "@/types";

interface CookTimeAdjusterProps {
  cookTime: number;
}

export default function CookTimeAdjuster({ cookTime }: CookTimeAdjusterProps) {
  const { settings } = useSettings();
  const [overrideEquipment, setOverrideEquipment] = useState<EquipmentType | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popoverOpen]);

  // Use override if set, otherwise default from settings
  const activeEquipment = overrideEquipment ?? (settings.equipment.length > 0 ? settings.equipment[0] as EquipmentType : null);
  const adjustment = adjustCookTime(cookTime, activeEquipment, settings.altitude);

  if (!adjustment) return null;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className="flex items-center gap-1 font-sans text-xs text-gray-600 hover:text-black transition-colors"
      >
        → ~{adjustment.adjustedMinutes} min
        <span className="text-gray-600">({adjustment.label})</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {popoverOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 py-1 min-w-[180px] z-50">
          <div className="px-3 py-1.5 border-b border-gray-200">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-600">
              Adjust for equipment
            </span>
          </div>
          <button
            onClick={() => { setOverrideEquipment(null); setPopoverOpen(false); }}
            className={`block w-full text-left px-3 py-2 font-sans text-sm transition-colors ${
              !overrideEquipment ? "text-black font-semibold bg-gray-50" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Default ({settings.equipment.length > 0 ? settings.equipment.map((e) =>
              EQUIPMENT_OPTIONS.find((o) => o.key === e)?.label
            ).join(", ") : "None"})
          </button>
          {EQUIPMENT_OPTIONS.map(({ key, label }) => {
            const adj = adjustCookTime(cookTime, key, settings.altitude);
            return (
              <button
                key={key}
                onClick={() => { setOverrideEquipment(key); setPopoverOpen(false); }}
                className={`block w-full text-left px-3 py-2 font-sans text-sm transition-colors ${
                  overrideEquipment === key ? "text-black font-semibold bg-gray-50" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
                {adj && <span className="text-gray-600 ml-1">~{adj.adjustedMinutes} min</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

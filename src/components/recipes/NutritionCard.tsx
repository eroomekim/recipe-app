"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NutritionData } from "@/types";

interface NutritionCardProps {
  nutrition: NutritionData;
}

export default function NutritionCard({ nutrition }: NutritionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { carbs, protein, fat } = nutrition;
  const total = (carbs ?? 0) + (protein ?? 0) + (fat ?? 0);

  // Macro percentages for the bar
  const carbsPct = total > 0 ? ((carbs ?? 0) / total) * 100 : 33;
  const proteinPct = total > 0 ? ((protein ?? 0) / total) * 100 : 33;
  const fatPct = total > 0 ? ((fat ?? 0) / total) * 100 : 34;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-4">
        <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500">
          Nutrition
        </h2>
        <span className="font-sans text-xs text-gray-400">per serving</span>
        {nutrition.estimated && (
          <span className="font-sans text-xs text-gray-400 italic">· estimated</span>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        {/* Macro bar */}
        {total > 0 && (
          <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
            <div style={{ width: `${carbsPct}%` }} className="bg-[#D946EF]" />
            <div style={{ width: `${proteinPct}%` }} className="bg-[#3B82F6]" />
            <div style={{ width: `${fatPct}%` }} className="bg-[#F97316]" />
          </div>
        )}

        {/* Macro values */}
        <div className="flex gap-4 text-sm">
          {carbs !== null && (
            <span className="font-sans">
              <span className="inline-block w-2 h-2 rounded-full bg-[#D946EF] mr-1.5" />
              Carbs <strong className="font-bold">{carbs}g</strong>
            </span>
          )}
          {protein !== null && (
            <span className="font-sans">
              <span className="inline-block w-2 h-2 rounded-full bg-[#3B82F6] mr-1.5" />
              Protein <strong className="font-bold">{protein}g</strong>
            </span>
          )}
          {fat !== null && (
            <span className="font-sans">
              <span className="inline-block w-2 h-2 rounded-full bg-[#F97316] mr-1.5" />
              Fat <strong className="font-bold">{fat}g</strong>
            </span>
          )}
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-1 font-sans text-xs font-semibold text-gray-500 hover:text-black transition-colors"
        >
          {expanded ? "Hide" : "See All Nutrition Facts"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {nutrition.calories !== null && (
              <div className="flex justify-between font-sans text-sm">
                <span className="text-gray-600">Calories</span>
                <span className="font-bold">{nutrition.calories}</span>
              </div>
            )}
            {fat !== null && (
              <div className="flex justify-between font-sans text-sm">
                <span className="text-gray-600">Total Fat</span>
                <span className="font-bold">{fat}g</span>
              </div>
            )}
            {carbs !== null && (
              <div className="flex justify-between font-sans text-sm">
                <span className="text-gray-600">Total Carbohydrates</span>
                <span className="font-bold">{carbs}g</span>
              </div>
            )}
            {nutrition.fiber !== null && (
              <div className="flex justify-between font-sans text-sm pl-4">
                <span className="text-gray-500">Dietary Fiber</span>
                <span>{nutrition.fiber}g</span>
              </div>
            )}
            {nutrition.sugar !== null && (
              <div className="flex justify-between font-sans text-sm pl-4">
                <span className="text-gray-500">Sugars</span>
                <span>{nutrition.sugar}g</span>
              </div>
            )}
            {protein !== null && (
              <div className="flex justify-between font-sans text-sm">
                <span className="text-gray-600">Protein</span>
                <span className="font-bold">{protein}g</span>
              </div>
            )}
            {nutrition.sodium !== null && (
              <div className="flex justify-between font-sans text-sm">
                <span className="text-gray-600">Sodium</span>
                <span className="font-bold">{nutrition.sodium}mg</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

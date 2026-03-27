"use client";

import CookingTimer from "./CookingTimer";
import { convertTemperatureInText } from "@/lib/unit-converter";

interface CookingStepProps {
  stepNumber: number;
  totalSteps: number;
  text: string;
  measurementSystem?: "imperial" | "metric";
}

// Extract time references from step text (e.g., "cook 15 minutes" → 15*60)
function extractTimerSeconds(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:minute|min)/i);
  if (match) return parseInt(match[1], 10) * 60;
  const hourMatch = text.match(/(\d+)\s*(?:hour|hr)/i);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 3600;
  return null;
}

export default function CookingStep({ stepNumber, totalSteps, text, measurementSystem = "imperial" }: CookingStepProps) {
  const timerSeconds = extractTimerSeconds(text);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="font-sans text-xs font-semibold uppercase tracking-wider text-white/50 mb-8">
        Step {stepNumber} of {totalSteps}
      </div>

      <p className="font-serif text-xl md:text-2xl leading-relaxed text-white max-w-[600px]">
        {convertTemperatureInText(text, measurementSystem)}
      </p>

      {timerSeconds && (
        <div className="mt-8">
          <CookingTimer totalSeconds={timerSeconds} />
        </div>
      )}
    </div>
  );
}

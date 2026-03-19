"use client";

import { useTimer } from "@/hooks/useTimer";

interface CookingTimerProps {
  totalSeconds: number;
}

export default function CookingTimer({ totalSeconds }: CookingTimerProps) {
  const { formatted, isRunning, isDone, start, pause, reset } = useTimer(totalSeconds);

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${
      isDone ? "bg-red text-white" : "bg-white/10 text-white"
    }`}>
      <span className="font-sans text-lg font-bold tabular-nums">
        {isDone ? "Done!" : formatted}
      </span>
      {!isDone && (
        <button
          onClick={isRunning ? pause : start}
          className="font-sans text-xs font-semibold uppercase tracking-wider hover:text-white/80 transition-colors"
        >
          {isRunning ? "Pause" : "Start"}
        </button>
      )}
      {(isRunning || isDone) && (
        <button
          onClick={reset}
          className="font-sans text-xs text-white/50 hover:text-white transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}

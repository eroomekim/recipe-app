"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TimerState {
  seconds: number;
  isRunning: boolean;
  isDone: boolean;
}

export function useTimer(totalSeconds: number) {
  const [state, setState] = useState<TimerState>({
    seconds: totalSeconds,
    isRunning: false,
    isDone: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setState((s) => ({ ...s, isRunning: true, isDone: false }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    setState({ seconds: totalSeconds, isRunning: false, isDone: false });
  }, [totalSeconds]);

  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState((s) => {
          if (s.seconds <= 1) {
            return { seconds: 0, isRunning: false, isDone: true };
          }
          return { ...s, seconds: s.seconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning]);

  // Play sound when done
  useEffect(() => {
    if (state.isDone) {
      let ctx: AudioContext | null = null;
      try {
        ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        // Close AudioContext after sound finishes
        osc.onended = () => ctx?.close();
      } catch {
        ctx?.close();
      }
    }
  }, [state.isDone]);

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, []);

  return { ...state, formatted: formatTime(state.seconds), start, pause, reset };
}

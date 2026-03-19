// src/components/cooking/VoiceControl.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface VoiceControlProps {
  onCommand: (command: "next" | "previous" | "repeat" | "ingredients") => void;
  enabled: boolean;
}

export default function VoiceControl({ onCommand, enabled }: VoiceControlProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand; // always latest, avoids re-creating recognition

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();

      if (transcript.includes("next")) onCommandRef.current("next");
      else if (transcript.includes("previous") || transcript.includes("back")) onCommandRef.current("previous");
      else if (transcript.includes("repeat") || transcript.includes("again")) onCommandRef.current("repeat");
      else if (transcript.includes("ingredient")) onCommandRef.current("ingredients");
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (recognitionRef.current) {
        try { recognition.start(); } catch { setListening(false); }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []); // uses onCommandRef, no dependency on onCommand prop

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (enabled && supported) startListening();
    else stopListening();
    return stopListening;
  }, [enabled, supported, startListening, stopListening]);

  if (!supported) return null;

  return (
    <div className={`flex items-center gap-2 ${listening ? "text-red" : "text-white/40"}`}>
      <div className={`w-2 h-2 rounded-full ${listening ? "bg-red animate-pulse" : "bg-white/30"}`} />
      <span className="font-sans text-xs font-semibold uppercase tracking-wider">
        {listening ? "Listening" : "Voice off"}
      </span>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";

interface ExtractionUsage {
  dailyLimit: number;
  totalUsed: number;
  blogUsed: number;
  socialUsed: number;
  remaining: number;
}

export default function SettingsPage() {
  const { settings, loading, update } = useSettings();
  const [usage, setUsage] = useState<ExtractionUsage | null>(null);

  useEffect(() => {
    fetch("/api/extraction-usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <main className="max-w-article mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-bold leading-none mb-8">Settings</h1>
        <p className="font-serif text-lg text-gray-500 italic">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-article mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-bold leading-none mb-10">Settings</h1>

      {/* Display Preferences */}
      <section className="mb-10">
        <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">
          Display Preferences
        </h2>

        {/* Measurement System */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div>
            <div className="font-serif text-base text-black">Measurement System</div>
            <div className="font-sans text-xs text-gray-500 mt-0.5">
              Convert ingredient units when viewing recipes
            </div>
          </div>
          <div className="flex">
            <button
              onClick={() => update({ measurementSystem: "imperial" })}
              className={`px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                settings.measurementSystem === "imperial"
                  ? "bg-black text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Imperial
            </button>
            <button
              onClick={() => update({ measurementSystem: "metric" })}
              className={`px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                settings.measurementSystem === "metric"
                  ? "bg-black text-white"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Metric
            </button>
          </div>
        </div>

        {/* Max Display Images */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div>
            <div className="font-serif text-base text-black">Max Images to Display</div>
            <div className="font-sans text-xs text-gray-500 mt-0.5">
              Limit the number of images shown per recipe
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => update({ maxDisplayImages: Math.max(2, settings.maxDisplayImages - 1) })}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Decrease"
            >
              <Minus className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <span className="font-sans text-base font-bold text-black w-6 text-center">
              {settings.maxDisplayImages}
            </span>
            <button
              onClick={() => update({ maxDisplayImages: Math.min(20, settings.maxDisplayImages + 1) })}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Increase"
            >
              <Plus className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Default Serving Size */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div>
            <div className="font-serif text-base text-black">Default Serving Size</div>
            <div className="font-sans text-xs text-gray-500 mt-0.5">
              Recipes will open pre-scaled to this serving count
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (settings.defaultServings === null) return;
                const next = settings.defaultServings - 1;
                update({ defaultServings: next < 1 ? null : next });
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Decrease"
            >
              <Minus className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <span className="font-sans text-base font-bold text-black min-w-[3rem] text-center">
              {settings.defaultServings ?? "Auto"}
            </span>
            <button
              onClick={() => update({ defaultServings: (settings.defaultServings ?? 0) + 1 })}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Increase"
            >
              <Plus className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        </div>
      </section>

      {/* Cooking Mode */}
      <section className="mb-10">
        <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">
          Cooking Mode
        </h2>

        {/* Auto Read Aloud */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div>
            <div className="font-serif text-base text-black">Auto Read Aloud</div>
            <div className="font-sans text-xs text-gray-500 mt-0.5">
              Automatically read steps aloud in guided cooking mode
            </div>
          </div>
          <button
            onClick={() => update({ cookingAutoReadAloud: !settings.cookingAutoReadAloud })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.cookingAutoReadAloud ? "bg-black" : "bg-gray-300"
            }`}
            aria-label="Toggle auto read aloud"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.cookingAutoReadAloud ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Keep Screen Awake */}
        <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <div>
            <div className="font-serif text-base text-black">Keep Screen Awake</div>
            <div className="font-sans text-xs text-gray-500 mt-0.5">
              Prevent screen from sleeping during cooking mode
            </div>
          </div>
          <button
            onClick={() => update({ cookingKeepAwake: !settings.cookingKeepAwake })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.cookingKeepAwake ? "bg-black" : "bg-gray-300"
            }`}
            aria-label="Toggle keep screen awake"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.cookingKeepAwake ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </section>

      {/* Extraction Usage */}
      <section className="mb-10">
        <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">
          Extraction Usage
        </h2>

        {usage ? (
          <>
            {/* Progress bar */}
            <div className="py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif text-base text-black">Today&apos;s Usage</div>
                <span className="font-sans text-sm font-bold text-black">
                  {usage.totalUsed} / {usage.dailyLimit}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.totalUsed / usage.dailyLimit) * 100)}%` }}
                />
              </div>
              <div className="font-sans text-xs text-gray-500 mt-1.5">
                {usage.remaining} extraction{usage.remaining !== 1 ? "s" : ""} remaining today
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex gap-8 py-4 border-b border-gray-200">
              <div>
                <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">URL Extractions</div>
                <div className="font-sans text-xl font-bold text-black mt-0.5">{usage.blogUsed}</div>
              </div>
              <div>
                <div className="font-sans text-xs text-gray-500 uppercase tracking-wider">Vision Extractions</div>
                <div className="font-sans text-xl font-bold text-black mt-0.5">{usage.socialUsed}</div>
              </div>
            </div>

            {/* Limit info */}
            <div className="py-4 border-b border-gray-200">
              <div className="font-serif text-base text-black">Daily Limit</div>
              <div className="font-sans text-xs text-gray-500 mt-0.5">
                {usage.dailyLimit} extractions per day across all types. Resets at midnight.
              </div>
            </div>
          </>
        ) : (
          <p className="font-serif text-base text-gray-500 italic">Loading usage data...</p>
        )}
      </section>

      <Link
        href="/recipes"
        className="font-sans text-xs text-gray-500 hover:text-black transition-colors"
      >
        &larr; Back to recipes
      </Link>
    </main>
  );
}

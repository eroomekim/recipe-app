"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({
  images,
  initialIndex,
  alt,
  onClose,
}: ImageLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c > 0 ? c - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setCurrent((c) => (c < images.length - 1 ? c + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white text-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-black/10 shrink-0">
        <span className="font-sans text-xs font-semibold text-black/50 tracking-wider uppercase">
          {current + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="px-3 py-3 text-black/50 hover:text-black transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0 px-4">
        <Image
          src={images[current]}
          alt={`${alt} - image ${current + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
        />

        {/* Prev/Next buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/10 hover:bg-black/20 text-black rounded-full transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/10 hover:bg-black/20 text-black rounded-full transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-5 border-t border-black/10 overflow-x-auto shrink-0">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-pressed={i === current}
              className={`shrink-0 w-12 h-12 rounded overflow-hidden transition-opacity relative ${
                i === current ? "opacity-100 ring-2 ring-black" : "opacity-30 hover:opacity-60"
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="48px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

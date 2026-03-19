"use client";

import { useState, useCallback } from "react";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  overlay?: boolean;
}

export default function ImageCarousel({
  images,
  alt,
  className = "",
  overlay = false,
}: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback(
    (index: number) => {
      setCurrent(Math.max(0, Math.min(index, images.length - 1)));
    },
    [images.length]
  );

  if (images.length === 0) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={images[current]}
        alt={`${alt} - image ${current + 1}`}
        className="w-full h-full object-cover"
      />

      {overlay && (
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/40"
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}

      {images.length > 1 && (
        <>
          <button
            onClick={() => goTo(current - 1)}
            className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
            aria-label="Previous image"
            disabled={current === 0}
          />
          <button
            onClick={() => goTo(current + 1)}
            className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
            aria-label="Next image"
            disabled={current === images.length - 1}
          />
        </>
      )}
    </div>
  );
}

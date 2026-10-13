import { useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

import { cn } from "@/lib/utils";

interface OrderImageCarouselProps {
  images: string[];
  className?: string;
}

/** Single image, a lightweight prev/next carousel for multiple, or a placeholder for none — no external carousel library needed. */
export function OrderImageCarousel({ images, className }: OrderImageCarouselProps) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted",
          className,
        )}
      >
        <Package className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className={cn("group relative overflow-hidden rounded-lg bg-white", className)}>
      <img
        src={images[index]}
        alt=""
        className="size-full object-contain p-1.5"
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setIndex((i) => (i - 1 + images.length) % images.length);
            }}
            aria-label="Previous image"
            className="absolute left-0.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 opacity-0 shadow transition-opacity group-hover:opacity-100"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setIndex((i) => (i + 1) % images.length);
            }}
            aria-label="Next image"
            className="absolute right-0.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 opacity-0 shadow transition-opacity group-hover:opacity-100"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === index ? "bg-primary" : "bg-background/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

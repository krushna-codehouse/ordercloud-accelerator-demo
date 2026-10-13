import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/product/ProductImage";

interface ProductGalleryProps {
  images: string[];
  alt?: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [images]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:gap-5">
      <ProductImage
        src={images[active]}
        alt={alt}
        className="aspect-square w-full rounded-3xl border border-border p-8"
      />

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                i === active
                  ? "border-primary"
                  : "border-border hover:border-muted-foreground/40",
              )}
            >
              <ProductImage
                src={img}
                alt={alt}
                className="size-16 p-1.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

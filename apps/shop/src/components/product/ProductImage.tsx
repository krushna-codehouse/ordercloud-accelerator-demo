import { useState } from "react";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

/** Product imagery with a graceful fallback when an image is missing/broken. */
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-white",
        className,
      )}
    >
      {showFallback ? (
        <Package className="size-10 text-muted-foreground/40" strokeWidth={1.25} />
      ) : (
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("size-full object-contain", imgClassName)}
        />
      )}
    </div>
  );
}

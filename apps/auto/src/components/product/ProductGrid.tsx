import type { BuyerProduct } from "ordercloud-javascript-sdk";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product/ProductCard";

interface ProductGridProps {
  products?: BuyerProduct[];
  isLoading?: boolean;
  skeletonCount?: number;
  className?: string;
}

export function ProductGrid({
  products,
  isLoading,
  skeletonCount = 8,
  className,
}: ProductGridProps) {
  const gridClass = cn(
    "grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4",
    className,
  );

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products?.map((product) => (
        <ProductCard key={product.ID} product={product} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-5 w-20" />
      </div>
    </div>
  );
}

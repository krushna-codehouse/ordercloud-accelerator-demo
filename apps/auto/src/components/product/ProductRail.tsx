import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { BuyerProduct } from "ordercloud-javascript-sdk";

import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/product/ProductGrid";

interface ProductRailProps {
  title: string;
  eyebrow?: string;
  products?: BuyerProduct[];
  isLoading?: boolean;
  viewAllHref?: string;
}

export function ProductRail({
  title,
  eyebrow,
  products,
  isLoading,
  viewAllHref,
}: ProductRailProps) {
  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-sm font-medium text-primary">{eyebrow}</p>
          )}
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[230px] shrink-0">
                <ProductCardSkeleton />
              </div>
            ))
          : products?.map((product) => (
              <div key={product.ID} className="w-[230px] shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
      </div>
    </section>
  );
}

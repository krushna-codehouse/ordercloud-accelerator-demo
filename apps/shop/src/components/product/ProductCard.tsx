import { Link } from "react-router-dom";
import type { BuyerProduct } from "ordercloud-javascript-sdk";

import { cn } from "@/lib/utils";
import { getFormattedPrice, getProductImage, getSku } from "@/lib/product";
import { ProductImage } from "@/components/product/ProductImage";
import { AddToCart } from "@/components/product/AddToCart";

interface ProductCardProps {
  product: BuyerProduct;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const image = getProductImage(product);
  const sku = getSku(product);
  const outOfStock = product.Inventory?.QuantityAvailable === 0;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5",
        className,
      )}
    >
      <Link
        to={`/products/${product.ID}`}
        className="relative block aspect-square overflow-hidden"
      >
        <ProductImage
          src={image}
          alt={product.Name}
          className="size-full p-5 transition-transform duration-500 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-background">
            Sold out
          </span>
        )}
        {!outOfStock && product.ID && (
          <div className="absolute bottom-3 right-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <AddToCart
              productID={product.ID}
              name={product.Name}
              iconOnly
              label={`Add ${product.Name} to bag`}
            />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {sku && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            SKU {sku}
          </span>
        )}
        <Link
          to={`/products/${product.ID}`}
          className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
        >
          {product.Name}
        </Link>
        <div className="mt-auto pt-2">
          <span className="font-display text-lg font-semibold">
            {getFormattedPrice(product)}
          </span>
        </div>
      </div>
    </div>
  );
}

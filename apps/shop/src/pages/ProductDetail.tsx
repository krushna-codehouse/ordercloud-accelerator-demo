import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useOcResourceGet,
  useOcResourceList,
} from "@ordercloud/react-sdk";
import type {
  BuyerProduct,
  InventoryRecord,
} from "ordercloud-javascript-sdk";
import {
  ChevronRight,
  PackageX,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { IS_MULTI_LOCATION_INVENTORY } from "@/constants";
import {
  getDescription,
  getFormattedPrice,
  getProductImages,
  getSku,
} from "@/lib/product";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/common/EmptyState";
import { ProductGallery } from "@/components/product/ProductGallery";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { AddToCart } from "@/components/product/AddToCart";
import { ProductRail } from "@/components/product/ProductRail";

export default function ProductDetail() {
  const { productId = "" } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [activeRecordId, setActiveRecordId] = useState<string>();

  const { data: product, isLoading } = useOcResourceGet<BuyerProduct>(
    "Me.Products",
    { productID: productId },
  );

  const { data: inventory } = useOcResourceList<InventoryRecord>(
    "Me.ProductInventoryRecords",
    undefined,
    { productID: productId },
    { disabled: !IS_MULTI_LOCATION_INVENTORY },
  );

  const { data: related } = useOcResourceList<BuyerProduct>("Me.Products", {
    pageSize: "12",
  });

  const relatedItems = useMemo(
    () => related?.Items?.filter((p) => p.ID !== productId).slice(0, 10),
    [related, productId],
  );

  if (isLoading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={PackageX}
          title="Product not found"
          description="This product may no longer be available."
          action={
            <Button asChild>
              <Link to="/products">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const images = getProductImages(product);
  const sku = getSku(product);
  const outOfStock = product.Inventory?.QuantityAvailable === 0;
  const inventoryItems = inventory?.Items ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link to="/products" className="hover:text-foreground">
          Shop
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="line-clamp-1 text-foreground">{product.Name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={images} alt={product.Name} />

        <div className="flex flex-col">
          {sku && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              SKU {sku}
            </span>
          )}
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight">
            {product.Name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold">
              {getFormattedPrice(product)}
            </span>
            <span className="text-sm text-muted-foreground">
              incl. GST
            </span>
          </div>

          <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {getDescription(product)}
          </p>

          {/* Multi-location inventory (feature-flagged) */}
          {IS_MULTI_LOCATION_INVENTORY && inventoryItems.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Pick up near you</p>
              <div className="flex flex-wrap gap-2">
                {inventoryItems.map((item) => (
                  <button
                    key={item.ID}
                    disabled={item.QuantityAvailable === 0}
                    onClick={() => setActiveRecordId(item.ID)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors disabled:opacity-40 ${
                      activeRecordId === item.ID
                        ? "border-primary bg-accent"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <span className="block font-medium">
                      {item.Address?.AddressName ?? item.Address?.City}
                    </span>
                    <span className="text-muted-foreground">
                      {item.QuantityAvailable} in stock
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-6" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              disabled={outOfStock}
            />
            <AddToCart
              productID={product.ID!}
              name={product.Name}
              quantity={quantity}
              inventoryRecordID={activeRecordId}
              disabled={outOfStock}
              label={outOfStock ? "Sold out" : "Add to bag"}
              className="flex-1"
            />
          </div>

          {/* Trust row */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <TrustBadge icon={Truck} label="Free shipping over $199" />
            <TrustBadge icon={RotateCcw} label="30-day returns" />
            <TrustBadge icon={ShieldCheck} label="Genuine warranty" />
          </div>

          {/* Details */}
          <Accordion type="single" collapsible className="mt-8" defaultValue="details">
            <AccordionItem value="details">
              <AccordionTrigger>Product details</AccordionTrigger>
              <AccordionContent>
                <dl className="space-y-2 text-sm">
                  <SpecRow label="Product ID" value={product.ID} />
                  {sku && <SpecRow label="SKU" value={sku} />}
                  {product.ShipWeight ? (
                    <SpecRow
                      label="Shipping weight"
                      value={`${product.ShipWeight} kg`}
                    />
                  ) : null}
                  <SpecRow label="Condition" value="Brand new, sealed" />
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery">
              <AccordionTrigger>Delivery &amp; returns</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Free shipping on orders over $199. Standard delivery
                  in 3–5 business days. Change your mind? Return unopened items
                  within 30 days for a full refund.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <ProductRail
        title="You may also like"
        eyebrow="More from Helix"
        products={relatedItems}
        viewAllHref="/products"
      />
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  label,
}: {
  icon: typeof Truck;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-center">
      <Icon className="size-5 text-primary" />
      <span className="text-[11px] leading-tight text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

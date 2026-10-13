import { useEffect, useMemo, useState } from "react";
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
  CheckCircle2,
  ChevronRight,
  PackageX,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

import { IS_MULTI_LOCATION_INVENTORY } from "@/constants";
import { cn } from "@/lib/utils";
import {
  getCurrency,
  getDescription,
  getProductImages,
  getProductPrice,
  getSku,
  getStockStatus,
} from "@/lib/product";
import { useFulfilment } from "@/hooks/use-fulfilment";
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
import { PriceTag } from "@/components/product/PriceTag";
import { StockBadge } from "@/components/product/StockBadge";
import { FulfilmentControl } from "@/components/cart/Fulfilment";

export default function ProductDetail() {
  const { productId = "" } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [activeRecordId, setActiveRecordId] = useState<string>();
  const { fulfilmentType, storeID, stores, setFulfilment } = useFulfilment();

  const { data: product, isLoading, refetch: refetchProduct } = useOcResourceGet<BuyerProduct>(
    "Me.Products",
    { productID: productId },
  );

  const { data: inventory, refetch: refetchInventory } = useOcResourceList<InventoryRecord>(
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

  const inventoryItems = useMemo(() => inventory?.Items ?? [], [inventory]);

  // InventoryRecords aren't tagged as "a pickup store" vs "the delivery/warehouse pool" —
  // we infer it from whether the record's Address matches one of the buyer-facing store
  // addresses. Anything that isn't a known store is treated as the delivery location.
  const storeAddressIds = useMemo(
    () => new Set(stores.map((s) => s.ID).filter((id): id is string => Boolean(id))),
    [stores],
  );
  const pickupRecords = useMemo(
    () => inventoryItems.filter((item) => item.Address?.ID && storeAddressIds.has(item.Address.ID)),
    [inventoryItems, storeAddressIds],
  );
  const deliveryRecord = useMemo(
    () => inventoryItems.find((item) => item.Address?.ID && !storeAddressIds.has(item.Address.ID)),
    [inventoryItems, storeAddressIds],
  );

  // Keep the PDP's "pick up near you" panel in sync with the order-wide fulfilment choice,
  // so the two pickup-store pickers (here and the header/cart dropdown) never disagree.
  useEffect(() => {
    if (fulfilmentType !== "pickup" || !storeID) return;
    const match = pickupRecords.find((item) => item.Address?.ID === storeID);
    if (match?.ID) setActiveRecordId(match.ID);
  }, [fulfilmentType, storeID, pickupRecords]);

  // Pickup checks the chosen store's own InventoryRecord. Delivery checks the dedicated
  // delivery/warehouse InventoryRecord if one exists (so it's a real, decrementing pool —
  // see deliveryRecord above); falls back to the product's read-only aggregate otherwise,
  // which is just a sum of all InventoryRecords once any exist, not an independent number.
  const activeRecord = pickupRecords.find((item) => item.ID === activeRecordId);
  // Only block on "pick a store" when this product actually has per-store records to
  // choose from — a product with none at all is untracked, and should behave the same
  // as it does for delivery (available, no store needed), not silently locked out.
  const awaitingStoreChoice =
    fulfilmentType === "pickup" && pickupRecords.length > 0 && !activeRecord;
  const relevantQuantity =
    fulfilmentType === "pickup"
      ? activeRecord?.QuantityAvailable
      : (deliveryRecord?.QuantityAvailable ?? product?.Inventory?.QuantityAvailable);

  // Never let the stepper sit above what's actually available — e.g. dropping from
  // Sydney (3) to Melbourne (0), or a store's stock shrinking under a quantity already chosen.
  useEffect(() => {
    if (relevantQuantity === undefined) return;
    setQuantity((q) => Math.min(q, Math.max(1, relevantQuantity)));
  }, [relevantQuantity]);

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

  const stockStatus = getStockStatus(relevantQuantity);
  const outOfStock = stockStatus === "out-of-stock";
  const addToCartDisabled = outOfStock || awaitingStoreChoice;

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
            <PriceTag
              productId={product.ID}
              price={getProductPrice(product)}
              currency={getCurrency(product)}
              size="lg"
            />
            <span className="text-sm text-muted-foreground">
              incl. GST
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Getting this as:</span>
              <FulfilmentControl className="-ml-2" />
            </div>
            <StockBadge status={stockStatus} quantityAvailable={relevantQuantity} />
          </div>

          <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {getDescription(product)}
          </p>

          {/* Multi-location inventory (feature-flagged) */}
          {IS_MULTI_LOCATION_INVENTORY && pickupRecords.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Pick up near you</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pickupRecords.map((item) => {
                  const itemStatus = getStockStatus(item.QuantityAvailable);
                  const isSelected = fulfilmentType === "pickup" && activeRecordId === item.ID;
                  return (
                    <button
                      key={item.ID}
                      disabled={itemStatus === "out-of-stock"}
                      onClick={() => {
                        setActiveRecordId(item.ID);
                        if (item.Address?.ID) setFulfilment("pickup", item.Address);
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                        isSelected
                          ? "border-primary bg-accent/60"
                          : "border-border hover:border-muted-foreground/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Store className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">
                            {item.Address?.AddressName ?? item.Address?.City}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="size-4 shrink-0 text-primary" />
                          )}
                        </span>
                        {item.Address?.Street1 && (
                          <span className="text-xs text-muted-foreground">
                            {item.Address.Street1}, {item.Address.City}
                          </span>
                        )}
                        <StockBadge
                          status={itemStatus}
                          quantityAvailable={item.QuantityAvailable}
                          className="mt-0.5"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
              {awaitingStoreChoice && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Choose a store above to see pickup availability.
                </p>
              )}
            </div>
          )}

          <Separator className="my-6" />

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                max={relevantQuantity ?? 999}
                disabled={addToCartDisabled}
              />
              <AddToCart
                productID={product.ID!}
                name={product.Name}
                quantity={quantity}
                inventoryRecordID={fulfilmentType === "pickup" ? activeRecordId : deliveryRecord?.ID}
                disabled={addToCartDisabled}
                label={outOfStock ? "Sold out" : "Add to bag"}
                className="flex-1"
                onSuccess={() => {
                  refetchProduct();
                  refetchInventory();
                }}
              />
            </div>
            {!outOfStock && relevantQuantity !== undefined && quantity >= relevantQuantity && (
              <p className="text-xs text-muted-foreground">
                Only {relevantQuantity} available{fulfilmentType === "pickup" ? " at this store" : ""}.
              </p>
            )}
          </div>

          {/* Trust row */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <TrustBadge icon={Truck} label="Free shipping over $99" />
            <TrustBadge icon={RotateCcw} label="30-day returns" />
            <TrustBadge icon={ShieldCheck} label="Genuine parts" />
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
                  <SpecRow label="Condition" value="Brand new, genuine" />
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery">
              <AccordionTrigger>Delivery &amp; returns</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Free shipping on orders over $99. Standard delivery
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
        eyebrow="More from Helix Auto"
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

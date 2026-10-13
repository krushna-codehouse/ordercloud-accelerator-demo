import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { OrderStatus } from "ordercloud-javascript-sdk";
import { Loader2, Package, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/currency";
import { getProductImage } from "@/lib/product";
import { useOrders, type OrderWithItems } from "@/hooks/use-orders";
import { useCart, useCartUI } from "@/hooks/use-cart";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { OrderImageCarousel } from "@/components/orders/OrderImageCarousel";

const STATUS_LABEL: Record<OrderStatus, string> = {
  Unsubmitted: "Unsubmitted",
  AwaitingApproval: "Awaiting approval",
  Declined: "Declined",
  Open: "Processing",
  Completed: "Completed",
  Canceled: "Canceled",
};

const STATUS_VARIANT: Record<OrderStatus, string> = {
  Unsubmitted: "bg-muted text-muted-foreground",
  AwaitingApproval: "bg-accent text-accent-foreground",
  Declined: "bg-destructive/10 text-destructive",
  Open: "bg-primary/10 text-primary",
  Completed: "bg-green-500/10 text-green-600 dark:text-green-400",
  Canceled: "bg-muted text-muted-foreground line-through",
};

type DateRange = "all" | "1m" | "6m" | "1y" | "2y";
const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "1m", label: "Last month" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
  { value: "2y", label: "Last 2 years" },
];

type SortOption = "newest" | "oldest" | "total-desc" | "total-asc";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "total-desc", label: "Total: high to low" },
  { value: "total-asc", label: "Total: low to high" },
];

function dateRangeCutoff(range: DateRange): Date | null {
  if (range === "all") return null;
  const cutoff = new Date();
  if (range === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
  if (range === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
  if (range === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
  if (range === "2y") cutoff.setFullYear(cutoff.getFullYear() - 2);
  return cutoff;
}

export default function Orders() {
  const { orders, isLoading } = useOrders();
  const { addItem } = useCart();
  const { open: openCartUI } = useCartUI();

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [reorderingId, setReorderingId] = useState<string>();

  const visibleOrders = useMemo(() => {
    const cutoff = dateRangeCutoff(dateRange);
    const query = search.trim().toLowerCase();

    let list = orders.filter((order) => {
      if (cutoff && (!order.DateSubmitted || new Date(order.DateSubmitted) < cutoff)) {
        return false;
      }
      if (!query) return true;
      const idMatch = order.ID?.toLowerCase().includes(query);
      const productMatch = order.lineItems.some((li) =>
        li.Product?.Name?.toLowerCase().includes(query),
      );
      return Boolean(idMatch || productMatch);
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.DateSubmitted ?? 0).getTime() - new Date(b.DateSubmitted ?? 0).getTime();
        case "total-desc":
          return (b.Total ?? 0) - (a.Total ?? 0);
        case "total-asc":
          return (a.Total ?? 0) - (b.Total ?? 0);
        default:
          return new Date(b.DateSubmitted ?? 0).getTime() - new Date(a.DateSubmitted ?? 0).getTime();
      }
    });

    return list;
  }, [orders, search, dateRange, sortBy]);

  const handleReorder = async (order: OrderWithItems) => {
    if (!order.ID) return;
    setReorderingId(order.ID);
    let succeeded = 0;
    let failed = 0;
    for (const li of order.lineItems) {
      if (!li.ProductID) continue;
      try {
        await addItem(li.ProductID, li.Quantity ?? 1, { silent: true });
        succeeded++;
      } catch {
        failed++;
      }
    }
    setReorderingId(undefined);
    if (succeeded > 0) {
      toast.success(
        `${succeeded} item${succeeded === 1 ? "" : "s"} added to your bag at today's price` +
          (failed ? ` — ${failed} couldn't be added` : ""),
      );
      openCartUI();
    } else {
      toast.error("Couldn't reorder — those items may no longer be available.");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-8 h-9 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Once you place an order, it'll show up here."
          action={
            <Button asChild>
              <Link to="/products">Start shopping</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">
        Your orders
      </h1>

      {/* Search / filter / sort */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number or product"
            className="pl-9"
          />
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="h-10 w-full sm:w-[170px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-10 w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!visibleOrders.length ? (
        <EmptyState
          icon={Search}
          title="No matching orders"
          description="Try a different search term or date range."
        />
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((order) => {
            const images = order.lineItems
              .map((li) => getProductImage(li.Product ?? undefined))
              .filter((u): u is string => Boolean(u));
            const reordering = reorderingId === order.ID;

            return (
              <Card key={order.ID}>
                <CardContent className="flex gap-4 p-5">
                  <OrderImageCarousel images={images} className="size-24 shrink-0" />

                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Link
                            to={`/orders/${order.ID}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            Order {order.ID}
                          </Link>
                          {order.Status && (
                            <Badge className={STATUS_VARIANT[order.Status]}>
                              {STATUS_LABEL[order.Status]}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.DateSubmitted
                            ? new Date(order.DateSubmitted).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "—"}{" "}
                          · {order.LineItemCount ?? 0} item
                          {order.LineItemCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatPrice(order.Total, order.Currency || "AUD")}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/orders/${order.ID}`}>View details</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReorder(order)}
                        disabled={reordering}
                      >
                        {reordering ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        Reorder
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

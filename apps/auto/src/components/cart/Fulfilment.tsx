import { ChevronDown, Loader2, Store, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFulfilment, useFulfilmentPromptUI } from "@/hooks/use-fulfilment";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * All three fulfilment UI shells live here, sharing one hook (useFulfilment)
 * as their single source of truth — pick whichever one fits the surface:
 *   - FulfilmentChoice: inline radio cards (full /cart page)
 *   - FulfilmentControl: compact dropdown (header, PDP, cart drawer)
 *   - FulfilmentPrompt: modal, opened once after the first item is added
 */

// ── Inline radio-card version — full /cart page ────────────────────────────
export function FulfilmentChoice() {
  const {
    hasOrder,
    fulfilmentType,
    storeID,
    stores,
    storesLoading,
    saving,
    setFulfilment,
  } = useFulfilment();

  if (!hasOrder) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-semibold">How do you want to get your order?</p>

      <RadioGroup
        value={fulfilmentType}
        onValueChange={(value) => {
          if (value === "delivery") setFulfilment("delivery");
        }}
        className="grid grid-cols-2 gap-3"
      >
        <Label
          htmlFor="fulfilment-delivery"
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition-colors",
            fulfilmentType === "delivery"
              ? "border-primary bg-accent/50"
              : "border-border hover:border-muted-foreground/40",
          )}
        >
          <RadioGroupItem id="fulfilment-delivery" value="delivery" disabled={saving} />
          <Truck className="size-4 shrink-0" />
          Ship to me
        </Label>
        <Label
          htmlFor="fulfilment-pickup"
          className={cn(
            "flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition-colors",
            fulfilmentType === "pickup"
              ? "border-primary bg-accent/50"
              : "border-border hover:border-muted-foreground/40",
          )}
        >
          <RadioGroupItem
            id="fulfilment-pickup"
            value="pickup"
            disabled={saving || stores.length === 0}
          />
          <Store className="size-4 shrink-0" />
          Pick up in store
        </Label>
      </RadioGroup>

      {fulfilmentType === "pickup" && (
        <div className="mt-4 space-y-2">
          {storesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : stores.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No pickup locations are set up yet.
            </p>
          ) : (
            <RadioGroup
              value={storeID}
              onValueChange={(newStoreID) => {
                const store = stores.find((s) => s.ID === newStoreID);
                if (store) setFulfilment("pickup", store);
              }}
              className="gap-2"
            >
              {stores.map((store) => (
                <Label
                  key={store.ID}
                  htmlFor={`store-${store.ID}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors",
                    storeID === store.ID
                      ? "border-primary bg-accent/50"
                      : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <RadioGroupItem
                    id={`store-${store.ID}`}
                    value={store.ID ?? ""}
                    disabled={saving}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {store.AddressName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {store.Street1}, {store.City}
                      {(store.xp as { hours?: string } | undefined)?.hours &&
                        ` — ${(store.xp as { hours?: string }).hours}`}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compact dropdown version — header, PDP, cart drawer ────────────────────
interface FulfilmentControlProps {
  className?: string;
  /** Icon-and-label size — "sm" fits the header, "default" fits PDP/cart. */
  size?: "sm" | "default";
}

export function FulfilmentControl({ className, size = "default" }: FulfilmentControlProps) {
  const { hasOrder, fulfilmentType, storeID, storeName, stores, storesLoading, saving, setFulfilment } =
    useFulfilment();

  if (!hasOrder) return null;

  const isPickup = fulfilmentType === "pickup";
  const label = isPickup ? storeName ?? "Pickup in store" : "Ship to me";
  const Icon = isPickup ? Store : Truck;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "sm" ? "sm" : "default"}
          disabled={saving}
          className={cn(
            "gap-1.5 font-medium",
            size === "sm" && "h-8 px-2 text-xs text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Icon className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>How do you want your order?</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setFulfilment("delivery")}>
          <Truck className="size-4" />
          Ship to me
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          Pick up in store
        </DropdownMenuLabel>
        {storesLoading ? (
          <DropdownMenuItem disabled>Loading stores…</DropdownMenuItem>
        ) : stores.length === 0 ? (
          <DropdownMenuItem disabled>No pickup locations yet</DropdownMenuItem>
        ) : (
          stores.map((store) => (
            <DropdownMenuItem
              key={store.ID}
              onClick={() => setFulfilment("pickup", store)}
              className={cn(isPickup && storeID === store.ID && "bg-accent text-accent-foreground")}
            >
              <Store className="size-4" />
              {store.AddressName}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── First-add modal — opened once via useFulfilmentPromptUI ────────────────
export function FulfilmentPrompt() {
  const { isOpen, close } = useFulfilmentPromptUI();
  const { hasChosen, fulfilmentType, storeID, stores, storesLoading, saving, setFulfilment } =
    useFulfilment();

  const choose = async (type: "delivery" | "pickup", store?: (typeof stores)[number]) => {
    await setFulfilment(type, store);
    close();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (!hasChosen) setFulfilment("delivery");
          close();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How do you want to get your order?</DialogTitle>
          <DialogDescription>
            Added to your bag. Ship it to you, or pick it up in store — you can change this
            anytime from your bag.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <Button
            variant={fulfilmentType === "delivery" ? "default" : "outline"}
            className="w-full justify-start gap-2.5"
            onClick={() => choose("delivery")}
            disabled={saving}
          >
            <Truck className="size-4" />
            Ship to me
          </Button>

          {!storesLoading && stores.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Or pick up in store</p>
              {stores.map((store) => (
                <Button
                  key={store.ID}
                  variant="outline"
                  className={cn(
                    "w-full justify-start gap-2.5",
                    fulfilmentType === "pickup" && storeID === store.ID && "border-primary bg-accent/50",
                  )}
                  onClick={() => choose("pickup", store)}
                  disabled={saving}
                >
                  <Store className="size-4" />
                  {store.AddressName}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

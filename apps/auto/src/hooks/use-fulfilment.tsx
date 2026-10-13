import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Orders, type BuyerAddress } from "ordercloud-javascript-sdk";
import { toast } from "sonner";

import { useCart } from "@/hooks/use-cart";
import { useStores } from "@/hooks/use-stores";

export type FulfilmentType = "delivery" | "pickup";

/** The shape of Order.xp this feature reads/writes — shared so pages that read
 * an order's xp directly (checkout, order confirmation) don't redeclare it. */
export interface OrderFulfilmentXp {
  fulfilmentType?: FulfilmentType;
  pickupStoreName?: string;
}

/** Single source of truth for the whole-order ship/pickup choice — read and set from anywhere (header, PDP, cart drawer, full cart, the first-add prompt). */
export function useFulfilment() {
  const { orderWorksheet, refreshWorksheet, setShippingAddressByID } = useCart();
  const { stores, isLoading: storesLoading } = useStores();
  const [saving, setSaving] = useState(false);

  const order = orderWorksheet?.Order;
  const xp = order?.xp as OrderFulfilmentXp | undefined;
  const hasChosen = Boolean(xp?.fulfilmentType);
  const fulfilmentType: FulfilmentType = xp?.fulfilmentType ?? "delivery";
  const storeID = order?.ShippingAddressID;
  const storeName = xp?.pickupStoreName;

  const setFulfilment = useCallback(
    async (type: FulfilmentType, store?: BuyerAddress) => {
      if (!order?.ID) return;
      setSaving(true);
      try {
        await Orders.Patch("Outgoing", order.ID, {
          xp: {
            fulfilmentType: type,
            pickupStoreName: type === "pickup" ? store?.AddressName : undefined,
          },
        });
        if (type === "pickup" && store?.ID) {
          await setShippingAddressByID(store.ID);
        }
        await refreshWorksheet();
      } catch {
        toast.error("Couldn't update how you'd like to get your order. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [order?.ID, refreshWorksheet, setShippingAddressByID],
  );

  return {
    hasOrder: Boolean(order?.ID),
    hasChosen,
    fulfilmentType,
    storeID,
    storeName,
    stores,
    storesLoading,
    saving,
    setFulfilment,
  };
}

// ── First-add prompt open/close state ───────────────────────────────────────
interface FulfilmentPromptState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const FulfilmentPromptContext = createContext<FulfilmentPromptState>({
  isOpen: false,
  open: () => null,
  close: () => null,
});

export function FulfilmentPromptProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<FulfilmentPromptState>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );
  return <FulfilmentPromptContext.Provider value={value}>{children}</FulfilmentPromptContext.Provider>;
}

export function useFulfilmentPromptUI() {
  return useContext(FulfilmentPromptContext);
}

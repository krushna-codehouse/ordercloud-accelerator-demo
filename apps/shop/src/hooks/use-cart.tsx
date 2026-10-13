import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useShopper } from "@ordercloud/react-sdk";
import { toast } from "sonner";

// ── Cart drawer open/close state ──────────────────────────────────────────
interface CartUIState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (value: boolean) => void;
}

const CartUIContext = createContext<CartUIState>({
  isOpen: false,
  open: () => null,
  close: () => null,
  setOpen: () => null,
});

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo<CartUIState>(
    () => ({
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      setOpen,
    }),
    [isOpen],
  );
  return (
    <CartUIContext.Provider value={value}>{children}</CartUIContext.Provider>
  );
}

export function useCartUI() {
  return useContext(CartUIContext);
}

// ── Cart data + actions (wraps the OrderCloud useShopper hook) ────────────
export function useCart() {
  const shopper = useShopper();
  const { open } = useCartUI();

  const lineItems = useMemo(
    () => shopper.orderWorksheet?.LineItems ?? [],
    [shopper.orderWorksheet],
  );

  const itemCount = useMemo(
    () => lineItems.reduce((sum, li) => sum + (li.Quantity || 0), 0),
    [lineItems],
  );

  // After a quantity-reducing mutation:
  // 1. Remove all applied promotions and re-apply eligible ones so auto-apply
  //    promos whose conditions are no longer met get cleared.
  // 2. If tax was already calculated (TaxCost > 0), recalculate so the
  //    checkout summary doesn't show a stale amount.
  const revalidatePromos = useCallback(async () => {
    const promos = shopper.orderWorksheet?.OrderPromotions ?? [];
    if (promos.length) {
      await Promise.all(
        promos
          .filter((p): p is typeof p & { ID: string } => Boolean(p.ID))
          .map((p) => shopper.removeCartPromo(p.ID)),
      );
      await shopper.applyPromotions();
    }

    if ((shopper.orderWorksheet?.Order?.TaxCost ?? 0) > 0) {
      try {
        await shopper.calculateOrder();
      } catch {
        // calculateOrder requires apps/api + a shipping selection; ignore if not ready.
      }
    }
  }, [shopper]);

  const deleteCartLineItem = useCallback(
    async (lineItemID: string) => {
      await shopper.deleteCartLineItem(lineItemID);
      await revalidatePromos();
    },
    [shopper, revalidatePromos],
  );

  const patchCartLineItem = useCallback(
    async (...args: Parameters<typeof shopper.patchCartLineItem>) => {
      await shopper.patchCartLineItem(...args);
      await revalidatePromos();
    },
    [shopper, revalidatePromos],
  );

  const addItem = useCallback(
    async (
      productID: string,
      quantity = 1,
      opts?: { name?: string; inventoryRecordID?: string; silent?: boolean },
    ) => {
      // If the product is already in the cart (same product + inventory record),
      // increment the existing line item's quantity instead of creating a new one.
      const existing = lineItems.find(
        (li) =>
          li.ProductID === productID &&
          (li.InventoryRecordID ?? undefined) === opts?.inventoryRecordID,
      );

      if (existing?.ID) {
        await patchCartLineItem({
          ID: existing.ID,
          lineItem: { Quantity: (existing.Quantity ?? 0) + quantity },
        });
      } else {
        await shopper.addCartLineItem({
          ProductID: productID,
          Quantity: quantity,
          InventoryRecordID: opts?.inventoryRecordID,
        });
        await revalidatePromos();
      }

      if (!opts?.silent) {
        open();
        toast.success(
          opts?.name ? `${opts.name} added to bag` : "Added to bag",
        );
      }
    },
    [shopper, lineItems, patchCartLineItem, revalidatePromos, open],
  );

  return { ...shopper, lineItems, itemCount, addItem, deleteCartLineItem, patchCartLineItem };
}

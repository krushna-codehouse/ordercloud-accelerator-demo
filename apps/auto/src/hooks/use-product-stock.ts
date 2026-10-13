import { useMemo } from "react";
import type { BuyerProduct } from "ordercloud-javascript-sdk";
import { useOcResourceList } from "@ordercloud/react-sdk";

/**
 * Looks up each product's aggregate stock quantity by ID. Needed for the cart, where
 * LineItem.Product is a lightweight snapshot that doesn't carry Inventory — unlike the
 * grid/PDP, which read Inventory straight off the fetched BuyerProduct.
 */
export function useProductStockByIds(productIDs: (string | undefined)[]) {
  const ids = useMemo(
    () => Array.from(new Set(productIDs.filter((id): id is string => Boolean(id)))),
    [productIDs],
  );

  const { data } = useOcResourceList<BuyerProduct>(
    "Me.Products",
    { filters: { ID: ids.join("|") }, pageSize: ids.length } as never,
    undefined,
    { disabled: ids.length === 0 },
  );

  return useMemo(() => {
    const map: Record<string, number | undefined> = {};
    for (const product of data?.Items ?? []) {
      if (product.ID) map[product.ID] = product.Inventory?.QuantityAvailable ?? undefined;
    }
    return map;
  }, [data]);
}

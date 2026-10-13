import { useMemo } from "react";
import { Me, type BuyerAddress } from "ordercloud-javascript-sdk";
import { useAuthQuery } from "@ordercloud/react-sdk";

/**
 * Shared, company-wide addresses tagged as physical stores (xp.isStoreLocation),
 * for the pickup picker. Filtered client-side — OrderCloud's xp filter on a
 * boolean field didn't match even via a direct, unwrapped SDK call, and this
 * list is always small (a handful of stores), so fetching all of a shopper's
 * visible addresses and filtering in JS is simpler and more reliable.
 */
export function useStores() {
  const { data, isLoading } = useAuthQuery({
    queryKey: ["storeLocations"],
    queryFn: async () => await Me.ListAddresses({ pageSize: 50 }),
    retry: false,
    refetchOnMount: false,
  });

  const stores = useMemo(
    () =>
      (data?.Items ?? []).filter(
        (a: BuyerAddress) => (a.xp as { isStoreLocation?: boolean } | undefined)?.isStoreLocation === true,
      ),
    [data],
  );

  return { stores, isLoading };
}

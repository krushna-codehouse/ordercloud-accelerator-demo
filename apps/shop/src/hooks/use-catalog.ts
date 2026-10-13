import { useMemo } from "react";
import { useOcResourceList } from "@ordercloud/react-sdk";
import type { Catalog, Category } from "ordercloud-javascript-sdk";

const STALE = 300000;

/** All catalogs the buyer can see. The demo seed has a single catalog. */
export function useCatalogs() {
  const query = useOcResourceList<Catalog>("Me.Catalogs", undefined, undefined, {
    staleTime: STALE,
  });
  const catalogs = useMemo(() => query.data?.Items ?? [], [query.data]);
  return { ...query, catalogs };
}

/** The primary (first) catalog — used to scope category + product browsing. */
export function usePrimaryCatalog() {
  const { catalogs, isLoading } = useCatalogs();
  return { catalog: catalogs[0], catalogID: catalogs[0]?.ID, isLoading };
}

/**
 * Categories for a catalog. We use the OrderCloud-canonical option keys
 * (`catalogID`, `depth`) which map straight through to Me.ListCategories.
 */
export function useCategories(catalogID?: string) {
  const query = useOcResourceList<Category>(
    "Me.Categories",
    { catalogID, depth: "all", pageSize: "100" },
    undefined,
    { staleTime: STALE, disabled: !catalogID },
  );
  const categories = useMemo(() => query.data?.Items ?? [], [query.data]);
  // Top-level categories only (no parent) for primary navigation.
  const topCategories = useMemo(
    () => categories.filter((c) => !c.ParentID),
    [categories],
  );
  return { ...query, categories, topCategories };
}

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useOcResourceListWithFacets } from "@ordercloud/react-sdk";
import type { BuyerProduct } from "ordercloud-javascript-sdk";
import { PackageSearch, SlidersHorizontal } from "lucide-react";

import { titleCase } from "@/lib/product";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Pagination } from "@/components/product/Pagination";
import { SortMenu, sortByFromParam } from "@/components/product/SortMenu";
import {
  FilterSidebar,
  type FacetLike,
} from "@/components/product/FilterSidebar";
import { EmptyState } from "@/components/common/EmptyState";
import { usePrimaryCatalog, useCategories } from "@/hooks/use-catalog";

const PAGE_SIZE = 12;
const RESERVED = new Set(["search", "category", "sort", "page", "pageSize"]);

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { catalogID } = usePrimaryCatalog();
  const { topCategories } = useCategories(catalogID);

  const search = searchParams.get("search") || undefined;
  const category = searchParams.get("category") || undefined;
  const sort = searchParams.get("sort") || "featured";
  const page = Number(searchParams.get("page")) || 1;

  const selectedFacets = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const key of searchParams.keys()) {
      if (!RESERVED.has(key)) map[key] = searchParams.getAll(key);
    }
    return map;
  }, [searchParams]);

  const listOptions = useMemo(() => {
    const options: Record<string, unknown> = {
      search,
      page: String(page),
      pageSize: PAGE_SIZE,
      sortBy: sortByFromParam(sort),
      catalogID,
      categoryID: category,
    };
    for (const [path, values] of Object.entries(selectedFacets)) {
      if (values.length) options[`xp.${path}`] = values.join("|");
    }
    return options;
  }, [search, page, sort, catalogID, category, selectedFacets]);

  const { data, isLoading, isFetching } = useOcResourceListWithFacets<BuyerProduct>(
    "Me.Products",
    listOptions as never,
  );

  const products = data?.Items;
  const totalPages = data?.Meta?.TotalPages ?? 1;
  const totalCount = data?.Meta?.TotalCount ?? 0;
  const facets = (data?.Meta?.Facets ?? []) as FacetLike[];

  // ── URL mutation helpers ────────────────────────────────────────────────
  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const setCategory = (id?: string) =>
    update((p) => {
      p.delete("page");
      if (id) p.set("category", id);
      else p.delete("category");
    });

  const setSort = (value: string) =>
    update((p) => {
      p.delete("page");
      if (value && value !== "featured") p.set("sort", value);
      else p.delete("sort");
    });

  const setPage = (n: number) => update((p) => p.set("page", String(n)));

  const toggleFacet = (path: string, value: string) =>
    update((p) => {
      p.delete("page");
      const current = p.getAll(path);
      p.delete(path);
      const nextValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      nextValues.forEach((v) => p.append(path, v));
    });

  const heading = search
    ? `Results for “${search}”`
    : category
      ? titleCase(topCategories.find((c) => c.ID === category)?.Name ?? category)
      : "All products";

  const sidebar = (
    <FilterSidebar
      categories={topCategories}
      activeCategory={category}
      onCategoryChange={setCategory}
      facets={facets}
      selectedFacets={selectedFacets}
      onFacetToggle={toggleFacet}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Shop</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {heading}
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop filters */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">{sidebar}</div>
        </aside>

        <div>
          {/* Toolbar */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${totalCount} product${totalCount === 1 ? "" : "s"}`}
            </p>
            <div className="flex items-center gap-2">
              {/* Mobile filters */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="size-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="p-6 pt-2">{sidebar}</div>
                </SheetContent>
              </Sheet>
              <SortMenu value={sort} onChange={setSort} />
            </div>
          </div>

          {/* Grid */}
          {!isLoading && (!products || products.length === 0) ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description="Try adjusting your search or filters to find what you're after."
              action={
                <Button variant="outline" onClick={() => setSearchParams({})}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div
              className={
                isFetching && !isLoading ? "opacity-60 transition-opacity" : ""
              }
            >
              <ProductGrid
                products={products}
                isLoading={isLoading}
                skeletonCount={PAGE_SIZE}
              />
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

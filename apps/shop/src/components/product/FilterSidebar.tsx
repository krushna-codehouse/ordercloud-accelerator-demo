import type { Category } from "ordercloud-javascript-sdk";

import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/product";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FacetLike {
  Name?: string;
  XpPath?: string;
  Values?: { Value?: string; Count?: number }[];
}

interface FilterSidebarProps {
  categories: Category[];
  activeCategory?: string;
  onCategoryChange: (id?: string) => void;
  facets?: FacetLike[];
  selectedFacets?: Record<string, string[]>;
  onFacetToggle?: (xpPath: string, value: string) => void;
}

export function FilterSidebar({
  categories,
  activeCategory,
  onCategoryChange,
  facets,
  selectedFacets = {},
  onFacetToggle,
}: FilterSidebarProps) {
  const hasFacets = facets?.some((f) => (f.Values?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Categories
        </h3>
        <ul className="space-y-0.5">
          <CategoryButton
            label="All products"
            active={!activeCategory}
            onClick={() => onCategoryChange(undefined)}
          />
          {categories.map((cat) => (
            <CategoryButton
              key={cat.ID}
              label={titleCase(cat.Name)}
              active={activeCategory === cat.ID}
              onClick={() => onCategoryChange(cat.ID)}
            />
          ))}
        </ul>
      </div>

      {hasFacets && (
        <Accordion
          type="multiple"
          defaultValue={facets?.map((f) => f.XpPath ?? f.Name ?? "")}
        >
          {facets?.map((facet) => {
            const path = facet.XpPath ?? facet.Name ?? "";
            const selected = selectedFacets[path] ?? [];
            if (!facet.Values?.length) return null;
            return (
              <AccordionItem key={path} value={path}>
                <AccordionTrigger>{titleCase(facet.Name)}</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {facet.Values.map((v) => {
                      const value = v.Value ?? "";
                      const checked = selected.includes(value);
                      return (
                        <li key={value}>
                          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                onFacetToggle?.(path, value)
                              }
                            />
                            <span className="flex-1">{titleCase(value)}</span>
                            {typeof v.Count === "number" && (
                              <span className="text-xs text-muted-foreground">
                                {v.Count}
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
          active
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {label}
      </button>
    </li>
  );
}

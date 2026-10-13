import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "name-desc", label: "Name: Z–A" },
] as const;

/** Map the UI sort value to an OrderCloud sortBy option. */
export function sortByFromParam(sort?: string): string | undefined {
  switch (sort) {
    case "price-asc":
      return "xp.Price";
    case "price-desc":
      return "!xp.Price";
    case "name-asc":
      return "Name";
    case "name-desc":
      return "!Name";
    default:
      return undefined;
  }
}

interface SortMenuProps {
  value: string;
  onChange: (value: string) => void;
}

export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <Select value={value || "featured"} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-[180px]">
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
  );
}

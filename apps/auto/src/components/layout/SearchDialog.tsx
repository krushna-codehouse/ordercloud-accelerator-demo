import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = ["Engine oil", "Car battery", "UHF radio", "Car wax", "Seat covers"];

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  const go = (value: string) => {
    const q = value.trim();
    setOpen(false);
    setTerm("");
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search products"
          className="text-muted-foreground hover:text-foreground"
        >
          <Search className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-[18%] translate-y-0 gap-5 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Search Helix Auto</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(term);
          }}
          className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search for products, brands and categories…"
            className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="icon-sm" aria-label="Search">
            <ArrowRight className="size-4" />
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Popular:
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => go(s)}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

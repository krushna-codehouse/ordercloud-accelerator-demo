import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import type { Category } from "ordercloud-javascript-sdk";

import { titleCase } from "@/lib/product";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";

interface MobileNavProps {
  categories: Category[];
  catalogID?: string;
}

export function MobileNav({ categories }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="lg:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Logo />
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2">
          <Link
            to="/products"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent hover:text-accent-foreground"
          >
            Shop all
          </Link>
          <Separator className="my-2" />
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categories
          </p>
          {categories.map((cat) => (
            <Link
              key={cat.ID}
              to={`/products?category=${cat.ID}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {titleCase(cat.Name)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}

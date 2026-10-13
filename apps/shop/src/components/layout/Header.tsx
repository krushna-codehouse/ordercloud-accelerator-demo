import { Link, NavLink } from "react-router-dom";
import { ChevronDown, LogOut, ShoppingBag, Sparkles, User } from "lucide-react";
import { useOrderCloudContext } from "@ordercloud/react-sdk";

import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/product";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchDialog } from "@/components/layout/SearchDialog";
import { MobileNav } from "@/components/layout/MobileNav";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { useCart, useCartUI } from "@/hooks/use-cart";
import { usePrimaryCatalog, useCategories } from "@/hooks/use-catalog";
import { useCurrentUser } from "@/hooks/use-current-user";

const NAV_LINKS = [
  { label: "Shop all", to: "/products" },
  { label: "Deals", to: "/products?sort=price" },
];

export function Header() {
  const { isLoggedIn, logout } = useOrderCloudContext();
  const { data: user } = useCurrentUser();
  const { catalogID } = usePrimaryCatalog();
  const { topCategories } = useCategories(catalogID);
  const { itemCount } = useCart();
  const { open: openCart } = useCartUI();

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Announcement strip */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium tracking-wide">
          <Sparkles className="size-3.5" />
          Free shipping on orders over $199 · 30-day returns
        </div>
      </div>

      <div className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* Mobile menu */}
          <MobileNav categories={topCategories} catalogID={catalogID} />

          <Link to="/" aria-label="Helix home" className="mr-1 shrink-0">
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {topCategories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="gap-1 text-sm font-medium text-foreground/80 hover:text-foreground"
                  >
                    Categories
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Shop by category</DropdownMenuLabel>
                  {topCategories.map((cat) => (
                    <DropdownMenuItem key={cat.ID} asChild>
                      <Link to={`/products?category=${cat.ID}`}>
                        {titleCase(cat.Name)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/products" className="font-medium text-primary">
                      View everything
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {NAV_LINKS.map((link) => (
              <Button
                key={link.label}
                asChild
                variant="ghost"
                className="text-sm font-medium text-foreground/80 hover:text-foreground"
              >
                <NavLink to={link.to}>{link.label}</NavLink>
              </Button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-0.5">
            <SearchDialog />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Account"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <User className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {user?.FirstName
                      ? `${user.FirstName} ${user.LastName ?? ""}`
                      : "Your account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <LoginDialog>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sign in"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <User className="size-5" />
                </Button>
              </LoginDialog>
            )}

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Bag, ${itemCount} items`}
              onClick={openCart}
              className="relative text-foreground"
            >
              <ShoppingBag className="size-5" />
              {itemCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full p-0 text-[10px] tabular-nums">
                  {itemCount > 99 ? "99+" : itemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export { NAV_LINKS };

export function NavGhostLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "text-sm font-medium transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-foreground/70",
          className,
        )
      }
    >
      {children}
    </NavLink>
  );
}

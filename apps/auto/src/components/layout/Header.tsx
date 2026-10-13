import { Link, NavLink } from "react-router-dom";
import { LogOut, Package, Settings, ShoppingBag, Sparkles, User } from "lucide-react";
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
import { FulfilmentControl } from "@/components/cart/Fulfilment";
import { useCart, useCartUI } from "@/hooks/use-cart";
import { usePrimaryCatalog, useCategories } from "@/hooks/use-catalog";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { AccountTheme } from "@/lib/account-theme";

const NAV_LINKS = [
  { label: "Shop all", to: "/products" },
  { label: "Deals", to: "/products?sort=price" },
];

export function Header() {
  const { isLoggedIn, logout } = useOrderCloudContext();
  const { data: user } = useCurrentUser();
  const accountTheme = (user?.xp as { theme?: AccountTheme } | undefined)?.theme;
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
          Free shipping on orders over $99 · 30-day returns · Click &amp; collect
        </div>
      </div>

      <div className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* Mobile menu */}
          <MobileNav categories={topCategories} catalogID={catalogID} />

          <div className="mr-1 flex shrink-0 items-center gap-2.5">
            <Link to="/" aria-label="Helix Auto home" className="flex">
              <Logo />
            </Link>
            {accountTheme?.displayName && (
              <>
                <span
                  aria-hidden="true"
                  className="hidden font-display text-xl font-light text-muted-foreground/50 sm:inline"
                >
                  x
                </span>
                <span className="hidden font-display text-xl font-bold leading-none tracking-tight text-primary sm:inline">
                  {accountTheme.displayName}
                </span>
              </>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="ml-4 hidden items-center gap-1 lg:flex">
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
            <div className="hidden md:block">
              <FulfilmentControl size="sm" />
            </div>
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
                    {accountTheme?.displayName ??
                      (user?.FirstName
                        ? `${user.FirstName} ${user.LastName ?? ""}`
                        : "Your account")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/orders">
                      <Package className="size-4" />
                      Your orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <Settings className="size-4" />
                      Edit profile
                    </Link>
                  </DropdownMenuItem>
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

      {/* Department bar — site-wide category navigation */}
      {topCategories.length > 0 && (
        <div className="hidden border-b border-border bg-card lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6">
            <Link
              to="/products"
              className="mr-1 shrink-0 whitespace-nowrap border-r border-border py-2.5 pr-4 text-sm font-semibold text-foreground"
            >
              All departments
            </Link>
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
              {topCategories.map((cat) => (
                <NavGhostLink
                  key={cat.ID}
                  to={`/products?category=${cat.ID}`}
                  className="whitespace-nowrap rounded-md px-3 py-2.5 hover:bg-accent hover:text-accent-foreground"
                >
                  {titleCase(cat.Name)}
                </NavGhostLink>
              ))}
            </div>
          </div>
        </div>
      )}
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

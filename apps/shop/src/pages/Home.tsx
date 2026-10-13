import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useOcResourceList } from "@ordercloud/react-sdk";
import type { BuyerProduct, Category } from "ordercloud-javascript-sdk";
import {
  ArrowRight,
  Cpu,
  Headphones,
  Laptop,
  Boxes,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  WashingMachine,
} from "lucide-react";

import { getFormattedPrice, getProductImage, titleCase } from "@/lib/product";
import { Button } from "@/components/ui/button";
import { HelixMark } from "@/components/brand/Logo";
import { ProductImage } from "@/components/product/ProductImage";
import { ProductRail } from "@/components/product/ProductRail";
import { usePrimaryCatalog, useCategories } from "@/hooks/use-catalog";

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  it: Cpu,
  computers: Laptop,
  communications: Smartphone,
  audio: Headphones,
  whitegoods: WashingMachine,
};

function categoryIcon(name?: string) {
  return CATEGORY_ICONS[(name ?? "").toLowerCase()] ?? Boxes;
}

export default function Home() {
  const { catalogID } = usePrimaryCatalog();
  const { topCategories } = useCategories(catalogID);
  const { data, isLoading } = useOcResourceList<BuyerProduct>("Me.Products", {
    pageSize: "20",
  });

  const products = useMemo(() => data?.Items ?? [], [data]);
  const heroProduct = products[0];
  const trending = products.slice(0, 10);
  const arrivals = products.slice(10, 20);

  return (
    <div>
      <Hero heroProduct={heroProduct} loading={isLoading} />
      <CategoryTiles categories={topCategories} />
      <ProductRail
        eyebrow="Hand-picked"
        title="Trending now"
        products={trending}
        isLoading={isLoading}
        viewAllHref="/products"
      />
      <ValueProps />
      <ProductRail
        eyebrow="Just landed"
        title="New arrivals"
        products={arrivals}
        isLoading={isLoading}
        viewAllHref="/products?sort=name-asc"
      />
      <PromoBanner />
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────
function Hero({
  heroProduct,
  loading,
}: {
  heroProduct?: BuyerProduct;
  loading?: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="bg-grid absolute inset-0 opacity-60" />
      <div className="absolute -left-32 -top-32 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-40 right-0 size-[28rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            New season tech is here
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Future-grade tech,{" "}
            <span className="text-primary">delivered.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
            Computers, audio and connected gear — curated, genuine and shipped
            fast. Welcome to Helix.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="xl">
              <Link to="/products">
                Shop all products
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link to="/products?category=audio">Explore audio</Link>
            </Button>
          </div>
          <dl className="mt-10 flex gap-8">
            {[
              { k: "10k+", v: "Products" },
              { k: "Free", v: "Express shipping" },
              { k: "30-day", v: "Easy returns" },
            ].map((stat) => (
              <div key={stat.v}>
                <dt className="font-display text-2xl font-bold">{stat.k}</dt>
                <dd className="text-xs text-muted-foreground">{stat.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Hero visual */}
        <div className="relative hidden lg:block">
          <div className="relative mx-auto aspect-square max-w-md">
            <div className="absolute inset-0 rounded-[2.5rem] bg-linear-to-br from-primary/20 via-card to-card shadow-2xl" />
            <HelixMark
              size={220}
              className="absolute -right-6 -top-6 opacity-10"
            />
            {heroProduct && !loading ? (
              <Link
                to={`/products/${heroProduct.ID}`}
                className="absolute inset-6 flex flex-col rounded-3xl border border-border bg-card p-6 shadow-xl transition-transform hover:-translate-y-1"
              >
                <span className="text-xs font-medium text-primary">
                  Featured
                </span>
                <ProductImage
                  src={getProductImage(heroProduct)}
                  alt={heroProduct.Name}
                  className="my-4 flex-1 rounded-2xl"
                />
                <p className="line-clamp-1 text-sm font-medium">
                  {heroProduct.Name}
                </p>
                <p className="font-display text-xl font-bold">
                  {getFormattedPrice(heroProduct)}
                </p>
              </Link>
            ) : (
              <div className="absolute inset-6 animate-pulse rounded-3xl border border-border bg-muted" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Category tiles ────────────────────────────────────────────────────────
function CategoryTiles({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Shop by category
        </h2>
        <Link
          to="/products"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          All categories
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((cat) => {
          const Icon = categoryIcon(cat.Name);
          return (
            <Link
              key={cat.ID}
              to={`/products?category=${cat.ID}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-6" />
              </span>
              <span className="text-sm font-semibold">
                {titleCase(cat.Name)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Value props ───────────────────────────────────────────────────────────
function ValueProps() {
  const props = [
    { icon: Truck, title: "Free shipping", desc: "On orders over $199" },
    { icon: ShieldCheck, title: "Genuine warranty", desc: "Authorised retailer" },
    { icon: RefreshCw, title: "30-day returns", desc: "Hassle-free refunds" },
    { icon: Sparkles, title: "Expert support", desc: "Real humans, 7 days" },
  ];
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {props.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Promo banner ──────────────────────────────────────────────────────────
function PromoBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground sm:px-16">
        <HelixMark
          size={260}
          className="absolute -right-10 -top-10 text-primary-foreground opacity-10"
        />
        <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Upgrade your setup today
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">
          From flagship laptops to studio-grade audio — discover the gear that
          moves you forward.
        </p>
        <div className="relative mt-7">
          <Button asChild size="xl" variant="secondary">
            <Link to="/products">
              Start shopping
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

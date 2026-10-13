import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOcResourceList } from "@ordercloud/react-sdk";
import type { BuyerProduct, Category } from "ordercloud-javascript-sdk";
import { toast } from "sonner";
import {
  ArrowRight,
  Armchair,
  BatteryCharging,
  Car,
  Caravan,
  CarFront,
  Cog,
  Droplets,
  Gauge,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";

import { titleCase } from "@/lib/product";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutoMark } from "@/components/brand/Logo";
import { ProductRail } from "@/components/product/ProductRail";
import { usePrimaryCatalog, useCategories } from "@/hooks/use-catalog";

// Keyed by the seeded category ID so the right glyph maps to each department.
const CATEGORY_ICONS: Record<string, typeof Cog> = {
  "tools-workshop": Wrench,
  "uhf-radios-antennas": RadioTower,
  "car-care-detailing": SprayCan,
  "oils-fluids": Droplets,
  batteries: BatteryCharging,
  "auto-electrical": Zap,
  "interior-accessories": Armchair,
  "performance-parts": Gauge,
  "exterior-styling": CarFront,
  "roof-racks-carriers": Caravan,
};

function categoryIcon(id?: string) {
  return CATEGORY_ICONS[(id ?? "").toLowerCase()] ?? Cog;
}

// Brands present in the seeded catalog — each links to a live product search.
const BRANDS = [
  "Penrite",
  "GME",
  "Meguiar's",
  "SAAS",
  "Century",
  "SuperCharge",
  "Rhino-Rack",
  "Autoglym",
  "Armor All",
  "Streetwize",
];

export default function Home() {
  const { catalogID } = usePrimaryCatalog();
  const { topCategories } = useCategories(catalogID);
  const { data, isLoading } = useOcResourceList<BuyerProduct>("Me.Products", {
    pageSize: "20",
  });

  const products = useMemo(() => data?.Items ?? [], [data]);
  const trending = products.slice(0, 10);
  const arrivals = products.slice(10, 20);

  return (
    <div>
      <Hero />
      <ValueProps />
      <DepartmentBento categories={topCategories} />
      <ProductRail
        eyebrow="Most popular"
        title="Top sellers"
        products={trending}
        isLoading={isLoading}
        viewAllHref="/products"
      />
      <BrandStrip />
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

// ── Hero with vehicle finder ────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden bg-[hsl(220_18%_8%)] text-white">
      <div className="bg-grid absolute inset-0 opacity-[0.18]" />
      <div className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="absolute -bottom-32 right-10 size-104 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            Genuine parts &amp; trusted brands
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            The right parts for
            <br className="hidden sm:block" /> every{" "}
            <span className="text-primary">drive.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-white/70 sm:text-lg">
            Car care, tools, batteries, oils and 4x4 gear — genuine brands,
            expert advice and fast shipping. Welcome to Helix Auto.
          </p>
          <dl className="mt-9 flex gap-8">
            {[
              { k: "Free", v: "Shipping over $99" },
              { k: "30-day", v: "Easy returns" },
              { k: "Expert", v: "Advice & support" },
            ].map((stat) => (
              <div key={stat.v}>
                <dt className="font-display text-2xl font-bold text-white">
                  {stat.k}
                </dt>
                <dd className="text-xs text-white/55">{stat.v}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/products"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-white transition-colors hover:text-primary"
          >
            Shop all parts
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <VehicleFinder />
      </div>
    </section>
  );
}

const MAKES = [
  "Toyota",
  "Ford",
  "Holden",
  "Mazda",
  "Hyundai",
  "Mitsubishi",
  "Nissan",
  "Subaru",
  "Volkswagen",
  "Kia",
];
const BODY_TYPES = ["Hatch", "Sedan", "SUV", "Ute", "Wagon", "Van"];
const YEARS = Array.from({ length: 21 }, (_, i) => String(2025 - i));

/**
 * A demo "find parts for your vehicle" selector — the signature layout element
 * of an auto-parts store. Submitting takes the shopper to the catalogue.
 */
function VehicleFinder() {
  const navigate = useNavigate();
  const [make, setMake] = useState("");
  const [body, setBody] = useState("");
  const [year, setYear] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = [year, make, body].filter(Boolean).join(" ");
    if (label) toast.success(`Showing parts for your ${label}`);
    navigate("/products");
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-white/10 bg-card p-6 text-card-foreground shadow-2xl sm:p-7"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
          <Car className="size-5" />
        </span>
        <div>
          <p className="font-display text-base font-bold leading-none">
            Find parts for your vehicle
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Shop parts and gear guaranteed to fit
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <Select value={make} onValueChange={setMake}>
          <SelectTrigger aria-label="Make">
            <SelectValue placeholder="Select make" />
          </SelectTrigger>
          <SelectContent>
            {MAKES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select value={body} onValueChange={setBody}>
            <SelectTrigger aria-label="Body type">
              <SelectValue placeholder="Body type" />
            </SelectTrigger>
            <SelectContent>
              {BODY_TYPES.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger aria-label="Year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" size="lg" className="mt-4 w-full">
        Find parts
        <ArrowRight className="size-4" />
      </Button>
      <Link
        to="/products"
        className="mt-3 block text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        or browse all parts
      </Link>
    </form>
  );
}

// ── Departments (bento) ─────────────────────────────────────────────────────
function DepartmentBento({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  const features = categories.slice(0, 2);
  const rest = categories.slice(2);

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Browse the range</p>
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Shop by department
          </h2>
        </div>
        <Link
          to="/products"
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          All departments
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {features.map((cat) => {
          const Icon = categoryIcon(cat.ID);
          return (
            <Link
              key={cat.ID}
              to={`/products?category=${cat.ID}`}
              className="group relative col-span-2 flex min-h-37.5 flex-col justify-between overflow-hidden rounded-3xl border border-border bg-linear-to-br from-primary/15 via-card to-card p-6 transition-all hover:border-primary/40 hover:shadow-xl"
            >
              <Icon className="relative size-9 text-primary" />
              <Icon className="pointer-events-none absolute -bottom-6 -right-5 size-36 text-primary/10" />
              <div className="relative">
                <p className="font-display text-lg font-bold leading-tight">
                  {titleCase(cat.Name)}
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Shop the range
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}

        {rest.map((cat) => {
          const Icon = categoryIcon(cat.ID);
          return (
            <Link
              key={cat.ID}
              to={`/products?category=${cat.ID}`}
              className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <span className="mt-4 text-sm font-semibold leading-tight">
                {titleCase(cat.Name)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Shop by brand ───────────────────────────────────────────────────────────
function BrandStrip() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Shop by brand
          </h2>
          <Link
            to="/products"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            All brands
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {BRANDS.map((brand) => (
            <Link
              key={brand}
              to={`/products?search=${encodeURIComponent(brand)}`}
              className="flex h-20 min-w-37.5 shrink-0 items-center justify-center rounded-2xl border border-border bg-background px-5 text-center font-display text-base font-bold tracking-tight transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
            >
              {brand}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Value props ───────────────────────────────────────────────────────────
function ValueProps() {
  const props = [
    { icon: Truck, title: "Free shipping", desc: "On orders over $99" },
    { icon: ShieldCheck, title: "Genuine parts", desc: "Trusted brands only" },
    { icon: RefreshCw, title: "30-day returns", desc: "Hassle-free refunds" },
    { icon: Wrench, title: "Expert advice", desc: "Real mechanics, 7 days" },
  ];
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
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
        <AutoMark
          size={260}
          className="absolute -right-10 -top-10 text-primary-foreground opacity-10"
        />
        <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Get your ride road-ready
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">
          From engine oil and batteries to 4x4 gear and detailing — everything
          to maintain, protect and upgrade your vehicle.
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

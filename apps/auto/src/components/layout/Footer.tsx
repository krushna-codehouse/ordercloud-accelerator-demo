import { Link } from "react-router-dom";
import { Github, Instagram, Twitter } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Separator } from "@/components/ui/separator";

const FOOTER_SECTIONS = [
  {
    title: "Shop",
    links: [
      { label: "All products", to: "/products" },
      { label: "Car Care & Detailing", to: "/products?category=car-care-detailing" },
      { label: "Oils & Fluids", to: "/products?category=oils-fluids" },
      { label: "Batteries", to: "/products?category=batteries" },
      { label: "Tools & Workshop", to: "/products?category=tools-workshop" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Track an order", to: "/products" },
      { label: "Shipping & returns", to: "/products" },
      { label: "Fitment guide", to: "/products" },
      { label: "Contact us", to: "/products" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Helix Auto", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Sustainability", to: "/" },
      { label: "Press", to: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Logo size={34} />
            <p className="max-w-xs text-sm text-muted-foreground">
              Genuine car parts, tools and accessories — trusted brands, expert
              advice and fast shipping. Powered by Sitecore OrderCloud.
            </p>
            <div className="flex gap-2">
              {[Twitter, Instagram, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Helix Auto. A Sitecore OrderCloud demo.</p>
          <div className="flex gap-5">
            <Link to="/" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/" className="hover:text-foreground">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

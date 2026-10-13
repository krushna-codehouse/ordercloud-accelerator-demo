import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Render only the wheel mark, no wordmark. */
  markOnly?: boolean;
  /** Size of the mark in px. */
  size?: number;
}

/**
 * The Helix Auto mark — a five-spoke alloy wheel. Always brand orange; the
 * wordmark inherits the foreground colour (with the "Auto" sub-brand in brand
 * orange) so it reads cleanly in both light and dark themes.
 */
export function AutoMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      {/* Tyre */}
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="currentColor"
        strokeWidth="4.5"
      />
      {/* Spokes — five, evenly spaced from the hub to the rim */}
      <g
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <line x1="32" y1="32" x2="32" y2="11" />
        <line x1="32" y1="32" x2="51.97" y2="25.51" />
        <line x1="32" y1="32" x2="44.33" y2="48.99" />
        <line x1="32" y1="32" x2="19.67" y2="48.99" />
        <line x1="32" y1="32" x2="12.03" y2="25.51" />
      </g>
      {/* Hub cap */}
      <circle cx="32" cy="32" r="6" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className, markOnly = false, size = 32 }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AutoMark size={size} />
      {!markOnly && (
        <span className="font-display text-xl font-bold leading-none tracking-tight text-foreground">
          Helix
          <span className="text-primary"> Auto</span>
        </span>
      )}
    </span>
  );
}

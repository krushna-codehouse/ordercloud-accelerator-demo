import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants";

interface LogoProps {
  className?: string;
  /** Render only the node-cluster mark, no wordmark. */
  markOnly?: boolean;
  /** Size of the mark in px. */
  size?: number;
}

/**
 * The Helix mark — a cluster of interconnected nodes with an orbiting accent
 * dot, assembled from the supplied red logo. The mark is always brand crimson;
 * the wordmark inherits the foreground colour so it works in light and dark.
 */
export function HelixMark({
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
      {/* Connector lines drawn under nodes */}
      <g stroke="currentColor" strokeWidth={5} strokeLinecap="round">
        <line x1="12" y1="48" x2="42" y2="14" />
        <line x1="12" y1="48" x2="52" y2="42" />
        <line x1="42" y1="14" x2="52" y2="42" />
        <line x1="42" y1="14" x2="36" y2="5" />
      </g>
      {/* Node circles */}
      <g fill="currentColor">
        <circle cx="12" cy="48" r="10" />
        <circle cx="42" cy="14" r="8" />
        <circle cx="52" cy="42" r="5" />
        <circle cx="36" cy="5" r="3" />
      </g>
    </svg>
  );
}

export function Logo({ className, markOnly = false, size = 32 }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <HelixMark size={size} />
      {!markOnly && (
        <span className="font-display text-xl font-bold leading-none tracking-tight text-foreground">
          {APP_NAME}
          <span className="text-primary">.</span>
        </span>
      )}
    </span>
  );
}

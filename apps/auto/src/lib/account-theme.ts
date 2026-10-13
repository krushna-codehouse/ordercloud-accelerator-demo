export interface AccountTheme {
  /** Any valid CSS color (hex, hsl(...), etc.) — applied as-is, no parsing. */
  primary?: string;
  brand?: string;
  brandDark?: string;
  /** Focus rings (buttons, inputs, checkboxes, etc. all use this). */
  ring?: string;
  /** Light hover/selected tint used across menus, nav links, tabs. */
  accent?: string;
  /** Text color shown on top of `accent`. */
  accentForeground?: string;
  /** Shown instead of First/Last name where the UI greets the shopper. */
  displayName?: string;
}

const CSS_VARS: Record<
  'primary' | 'brand' | 'brandDark' | 'ring' | 'accent' | 'accentForeground',
  string
> = {
  primary: '--primary',
  brand: '--brand',
  brandDark: '--brand-dark',
  ring: '--ring',
  accent: '--accent',
  accentForeground: '--accent-foreground',
};

/** Overrides (or clears) the site's root color variables for the signed-in account. */
export function applyAccountTheme(theme?: AccountTheme | null): void {
  const root = document.documentElement;
  for (const key of Object.keys(CSS_VARS) as (keyof typeof CSS_VARS)[]) {
    const value = theme?.[key];
    if (value) {
      root.style.setProperty(CSS_VARS[key], value);
    } else {
      root.style.removeProperty(CSS_VARS[key]);
    }
  }
}

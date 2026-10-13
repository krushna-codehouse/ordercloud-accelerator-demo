import { useEffect } from "react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { applyAccountTheme, type AccountTheme } from "@/lib/account-theme";

/** Applies the signed-in account's xp.theme (if any) to the page's CSS variables. Guests/normal accounts with no theme just get the site default. */
export function useAccountTheme(): AccountTheme | undefined {
  const { data: user } = useCurrentUser();
  const theme = (user?.xp as { theme?: AccountTheme } | undefined)?.theme;

  useEffect(() => {
    applyAccountTheme(theme);
  }, [theme]);

  return theme;
}

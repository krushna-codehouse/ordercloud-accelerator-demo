import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartSheet } from "@/components/cart/CartSheet";
import { FulfilmentPrompt } from "@/components/cart/Fulfilment";
import { useAccountTheme } from "@/hooks/use-account-theme";

export default function Layout() {
  const { pathname } = useLocation();
  useAccountTheme();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartSheet />
      <FulfilmentPrompt />
    </div>
  );
}

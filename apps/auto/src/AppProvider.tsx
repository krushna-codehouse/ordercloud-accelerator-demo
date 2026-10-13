import { useCallback } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import {
  type IOrderCloudErrorContext,
  OrderCloudProvider,
} from "@ordercloud/react-sdk";
import { OrderCloudError } from "ordercloud-javascript-sdk";
import { toast } from "sonner";

import routes from "@/routes";
import {
  ALLOW_ANONYMOUS,
  BASE_API_URL,
  CLIENT_ID,
  IS_AUTO_APPLY,
  OPENID_CONNECT_CONFIG_ID,
  OPENID_CONNECT_ENABLED,
  OPENIDCONNECT_ACCESS_TOKEN_QUERY_PARAM_NAME,
  OPENIDCONNECT_IDP_ACCESS_TOKEN_QUERY_PARAM_NAME,
  OPENIDCONNECT_REFRESH_TOKEN_QUERY_PARAM_NAME,
} from "@/constants";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CartUIProvider } from "@/hooks/use-cart";
import { FulfilmentPromptProvider } from "@/hooks/use-fulfilment";

const router = createBrowserRouter(routes);

export default function AppProvider() {
  const defaultErrorHandler = useCallback(
    (error: OrderCloudError, { logout }: IOrderCloudErrorContext) => {
      if (error.status === 401) return logout();
      toast.error(error.status === 403 ? "Permission denied" : error.message);
    },
    [],
  );

  return (
    <ThemeProvider defaultTheme="light">
      <OrderCloudProvider
        baseApiUrl={BASE_API_URL}
        clientId={CLIENT_ID}
        scope={[]}
        customScope={[]}
        allowAnonymous={ALLOW_ANONYMOUS}
        autoApplyPromotions={IS_AUTO_APPLY}
        defaultErrorHandler={defaultErrorHandler}
        openIdConnect={{
          enabled: OPENID_CONNECT_ENABLED,
          autoRedirect: true,
          configs: [{ id: OPENID_CONNECT_CONFIG_ID }],
          accessTokenQueryParamName: OPENIDCONNECT_ACCESS_TOKEN_QUERY_PARAM_NAME,
          refreshTokenQueryParamName:
            OPENIDCONNECT_REFRESH_TOKEN_QUERY_PARAM_NAME,
          idpAccessTokenQueryParamName:
            OPENIDCONNECT_IDP_ACCESS_TOKEN_QUERY_PARAM_NAME,
        }}
      >
        <TooltipProvider delayDuration={200}>
          <CartUIProvider>
            <FulfilmentPromptProvider>
              <RouterProvider router={router} />
            </FulfilmentPromptProvider>
          </CartUIProvider>
          <Toaster />
        </TooltipProvider>
      </OrderCloudProvider>
    </ThemeProvider>
  );
}

// Helix Auto storefront configuration — reads the same VITE_APP_* contract as
// apps/storefront so the infrastructure tool can generate .env.local for it.

export const APP_NAME = import.meta.env.VITE_APP_NAME || "Helix Auto";

export const BASE_API_URL =
  import.meta.env.VITE_APP_ORDERCLOUD_BASE_API_URL ||
  "https://api.ordercloud.io/v1";

export const CLIENT_ID = import.meta.env.VITE_APP_ORDERCLOUD_CLIENT_ID;

export const ALLOW_ANONYMOUS =
  import.meta.env.VITE_APP_ORDERCLOUD_ALLOW_ANONYMOUS === "true";

// apps/api base URL — used only by /signup, the one place this storefront calls
// apps/api directly (account creation needs elevated, server-side-only permissions).
export const API_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:7276";

// OpenID Connect
export const OPENID_CONNECT_ENABLED =
  import.meta.env.VITE_APP_ORDERCLOUD_OPENIDCONNECT_ENABLED === "true";
export const OPENID_CONNECT_CONFIG_ID =
  import.meta.env.VITE_APP_ORDERCLOUD_OPENIDCONNECT_CONFIG_ID || "";
export const OPENIDCONNECT_ACCESS_TOKEN_QUERY_PARAM_NAME =
  import.meta.env.VITE_APP_ORDERCLOUD_OPENIDCONNECT_ACCESS_TOKEN_QUERY_PARAM_NAME ||
  "";
export const OPENIDCONNECT_REFRESH_TOKEN_QUERY_PARAM_NAME =
  import.meta.env
    .VITE_APP_ORDERCLOUD_OPENIDCONNECT_REFRESH_TOKEN_QUERY_PARAM_NAME || "";
export const OPENIDCONNECT_IDP_ACCESS_TOKEN_QUERY_PARAM_NAME =
  import.meta.env
    .VITE_APP_ORDERCLOUD_OPENIDCONNECT_IDP_ACCESS_TOKEN_QUERY_PARAM_NAME || "";

// Feature flags
export const IS_MULTI_LOCATION_INVENTORY =
  import.meta.env.VITE_APP_ORDERCLOUD_MULTILOCATION_INVENTORY === "true";
export const IS_AUTO_APPLY =
  import.meta.env.VITE_APP_ORDERCLOUD_AUTO_APPLY_PROMOS === "true";

// Payment
export enum PAYMENT_PROVIDERS {
  CARD_CONNECT = "CARD_CONNECT",
  PAYPAL = "PAYPAL",
  STRIPE = "STRIPE",
  BLUESNAP = "BLUESNAP",
}

export const PAYMENT_PROVIDER =
  (import.meta.env.VITE_APP_PAYMENT_PROVIDER as PAYMENT_PROVIDERS) ||
  PAYMENT_PROVIDERS.STRIPE;

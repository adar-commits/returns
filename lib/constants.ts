/** Default logo shown in customer flow (same-origin; override with env NEXT_PUBLIC_LOGO_URL). */
export const DEFAULT_LOGO_URL = "/img/HoM_logo.webp";

/** Default webhook URL used when no setting or env is configured for OTP, sizes, or final. */
export const DEFAULT_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/e437eb1f-8b91-4c08-adbb-1b9c1d96ea09";

/** Default webhook URL for Orders (separate n8n workflow). */
export const DEFAULT_ORDERS_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/8374ae15-f23d-4db7-af59-39fdab4b32e5";

/** Default webhook URL for GetSizes (replacement options per SKU). */
export const DEFAULT_SIZES_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/0ce18bc2-3479-499e-91ad-a176e00464d8";

/** Default webhook URL for Branches (store list). */
export const DEFAULT_BRANCHES_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/1afacfcf-bdb5-455a-a84a-8475352b7479";

/** Default logo shown in customer flow (same-origin; override with env NEXT_PUBLIC_LOGO_URL). */
export const DEFAULT_LOGO_URL = "/img/HoM_logo.webp";

/** Default webhook URL used when no setting or env is configured for OTP, sizes, or final. */
export const DEFAULT_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/e437eb1f-8b91-4c08-adbb-1b9c1d96ea09";

/** App base URL for PayPlus redirects and confirm links (override with NEXT_PUBLIC_APP_URL). */
export const DEFAULT_APP_URL = "https://csreturns.vercel.app";

/** Default webhook URL for Orders (separate n8n workflow). */
export const DEFAULT_ORDERS_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/8374ae15-f23d-4db7-af59-39fdab4b32e5";

/** Default webhook URL for GetSizes (replacement options per SKU). */
export const DEFAULT_SIZES_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/0ce18bc2-3479-499e-91ad-a176e00464d8";

/** Default webhook URL for Branches (store list). */
export const DEFAULT_BRANCHES_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/1afacfcf-bdb5-455a-a84a-8475352b7479";

/** Webhook to validate coupon codes (POST { coupon }). Override with COUPON_WEBHOOK_URL. */
export const DEFAULT_COUPON_WEBHOOK_URL =
  "https://redcarpet.app.n8n.cloud/webhook/f79bd7dd-9467-404b-a3ae-ec0f1fc88697";

/** SKUs always restricted from product selection (not shown in return/replace item list). Merged with restricted_skus from settings. */
export const DEFAULT_RESTRICTED_SKUS: string[] = [
  "1002", "1112",
  "22201002-120120", "22201002-120170", "22201002-140190", "22201002-160160", "22201002-160230",
  "22201002-200200", "22201002-200300", "22201002-240340", "22201002-300400",
  "22201002-80150", "22201002-80200", "22201002-80300",
  "33301003-200290", "33301003-240340", "33301003-300400",
  "44401004", "44402041", "50055555", "55501005",
  "7052023", "7052024", "7052025", "7052026", "7052027", "7052028", "7052029", "7052030",
  "7052031", "7052032", "7052033", "7052034", "7052035", "7052037", "7052038", "7052039",
  "7052040", "7052041", "7052042", "7052043", "7052044", "7052045", "7052046", "7052047",
  "7052048", "7052049", "7052050", "7052051", "7052052", "7052053", "7052054", "7052055",
  "7052056", "7052057", "7052058", "7052059", "7052060", "7052061", "7052062", "7052063",
  "7052064", "7052065", "7052066", "7052067", "7052068", "7052069", "7052070", "7052071",
  "7052072", "7052073", "7052074", "7052075", "7052076", "7052077", "7052078",
  "8000", "8000-4000", "800300106", "9000", "9067236", "991071", "992000", "992002",
  "992012", "992017", "992019", "99400-500", "99400-900", "9999-1", "9999-2",
  "ACE-2", "DM-5001", "DM-5002", "DM-5010", "FOX-1", "FOX-3", "FOX-4", "ISRA20",
  "NewCarpet", "PIK-1", "SHILAV-1", "SHILAV-4", "SILCO-01", "SILCO-02", "htz10", "mama10",
];

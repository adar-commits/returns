/**
 * PayPlus Payment Pages – generate link for customer to pay.
 * @see https://docs.payplus.co.il/reference/post_paymentpages-generatelink
 */

const PAYPLUS_BASE = "https://restapi.payplus.co.il/api/v1.0";

export type GenerateLinkParams = {
  amount: number; // ILS
  return_id: string;
  success_url: string;
  failure_url: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
};

export type GenerateLinkResult =
  | { payment_page_link: string; page_request_uid: string; error?: never }
  | { payment_page_link?: never; page_request_uid?: never; error: string };

export async function generatePaymentLink(params: GenerateLinkParams): Promise<GenerateLinkResult> {
  const apiKey = process.env.PAYPLUS_API_KEY;
  const secretKey = process.env.PAYPLUS_SECRET_KEY;
  const paymentPageUid = process.env.PAYPLUS_PAYMENT_PAGE_UID || "7a0bc4d4-f35f-4301-a945-926378a2416d";

  if (!apiKey || !secretKey) {
    console.error("PayPlus: PAYPLUS_API_KEY or PAYPLUS_SECRET_KEY not set");
    return { error: "Payment is not configured. Please contact support." };
  }

  const body = {
    payment_page_uid: paymentPageUid,
    amount: params.amount,
    currency_code: "ILS",
    sendEmailApproval: true,
    sendEmailFailure: false,
    refURL_success: params.success_url,
    refURL_failure: params.failure_url,
    language_code: "he",
    ...(params.customer_name || params.customer_email
      ? {
          customer: {
            customer_name: params.customer_name || "Customer",
            email: params.customer_email || "no-reply@returns.local",
            ...(params.customer_phone && { phone: params.customer_phone }),
          },
        }
      : {}),
  };

  let res: Response;
  let data: Record<string, unknown> = {};
  try {
    res = await fetch(`${PAYPLUS_BASE}/PaymentPages/generateLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: JSON.stringify({ api_key: apiKey, secret_key: secretKey }),
      },
      body: JSON.stringify(body),
    });
    data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  } catch (e) {
    console.error("PayPlus generateLink request failed:", e);
    return { error: "Payment service unavailable. Please try again later." };
  }

  if (!res.ok) {
    const msg = (data?.results as { description?: string })?.description || (data?.message as string) || res.statusText;
    console.error("PayPlus generateLink error:", res.status, data);
    return { error: msg || "Payment service error. Please try again or contact support." };
  }

  const results = data.results as { status?: string } | undefined;
  const resultData = (data.data ?? data.Data) as { payment_page_link?: string; page_request_uid?: string } | undefined;
  const link = resultData?.payment_page_link;

  if (results?.status !== "success" || !link) {
    const msg = (results as { description?: string })?.description || (data?.message as string) || "Invalid response from payment service.";
    console.error("PayPlus generateLink unexpected response:", data);
    return { error: msg };
  }

  return {
    payment_page_link: link,
    page_request_uid: resultData.page_request_uid || "",
  };
}

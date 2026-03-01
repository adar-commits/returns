/**
 * PayPlus Payment Pages – generate link for customer to pay.
 * Hardcoded URL, auth, and body shape per working request.
 */

const PAYPLUS_URL = "https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink";
const PAYPLUS_AUTH = '{"api_key":"cfd5a2f5-d4e9-4f12-a8b6-c0bdd585df04","secret_key":"ba1ecb62-8c53-4278-8a4d-5f67a5d14a21"}';

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
  const body = {
    payment_page_uid: "c97ea01d-bad2-45bc-b662-c4b99cff6cd4",
    expiry_datetime: "30",
    payments: "12",
    amount: params.amount,
    currency_code: "ILS",
    sendEmailApproval: false,
    sendEmailFailure: false,
    refURL_success: params.success_url,
    refURL_failure: params.failure_url,
    language_code: "he",
    customer: {
      customer_name: params.customer_name || "Test Customer",
      email: params.customer_email || "test@example.com",
      phone: params.customer_phone || "0501234567",
    },
  };

  let res: Response;
  let data: Record<string, unknown> = {};
  try {
    res = await fetch(PAYPLUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: PAYPLUS_AUTH,
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

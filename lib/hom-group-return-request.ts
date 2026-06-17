import {
  HOM_GROUP_RETURN_REQUESTS_BEARER,
  HOM_GROUP_RETURN_REQUESTS_URL,
} from "@/lib/constants";

/** Payload posted to HoM Group for every new return request (information mirror). */
export type HomGroupReturnRequestPayload = Record<string, unknown>;

/**
 * POST return request JSON to HoM Group service. Best-effort; failures are logged only.
 */
export async function notifyHomGroupReturnRequest(payload: HomGroupReturnRequestPayload): Promise<void> {
  const res = await fetch(HOM_GROUP_RETURN_REQUESTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HOM_GROUP_RETURN_REQUESTS_BEARER}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HoM Group return-requests ${res.status}: ${text || res.statusText}`);
  }
}

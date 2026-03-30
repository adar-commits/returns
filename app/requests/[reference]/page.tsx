import { redirect } from "next/navigation";

/**
 * Alias for bookmarked / mistyped URLs: /requests/RET-00002 → staff detail.
 * Staff layout still enforces login on the destination.
 */
export default function PublicRequestsReferenceAliasPage({
  params,
}: {
  params: { reference: string };
}) {
  const ref = decodeURIComponent(params.reference || "").trim();
  redirect(`/staff/requests/${encodeURIComponent(ref)}`);
}

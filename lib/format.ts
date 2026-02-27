/**
 * Format order/invoice date for display as dd/mm/yyyy.
 * Accepts ISO or any string parseable by Date.
 */
export function formatOrderDate(ivdate: string | undefined | null): string {
  if (ivdate == null || String(ivdate).trim() === "") return "";
  const d = new Date(String(ivdate).trim());
  if (Number.isNaN(d.getTime())) return String(ivdate);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

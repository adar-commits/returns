/**
 * Parse order/invoice date string (ISO, DD/MM/YYYY, or other) to Date.
 * Returns null if unparseable.
 */
export function parseOrderDate(ivdate: string | undefined | null): Date | null {
  if (ivdate == null || String(ivdate).trim() === "") return null;
  const s = String(ivdate).trim();
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY or D/M/YYYY
  const parts = s.split(/[/-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (p0 > 31 && p2 <= 31) {
      return new Date(p0, p1 - 1, p2);
    }
    if (p2 >= 1000) return new Date(p2, p1 - 1, p0);
    if (p0 >= 1000) return new Date(p0, p1 - 1, p2);
  }
  return null;
}

/**
 * Format order/invoice date for display as dd/mm/yyyy.
 * Accepts ISO or any string parseable by Date.
 */
export function formatOrderDate(ivdate: string | undefined | null): string {
  const d = parseOrderDate(ivdate);
  if (!d) return ivdate != null ? String(ivdate) : "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

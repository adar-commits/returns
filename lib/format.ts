/**
 * Parse order/invoice date string (ISO, DD/MM/YYYY, D/M/YY, etc.) to Date.
 * Returns null if unparseable.
 */
export function parseOrderDate(ivdate: string | undefined | null): Date | null {
  if (ivdate == null || String(ivdate).trim() === "") return null;
  const s = String(ivdate).trim();
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY, DD.MM.YYYY, D/M/YY, etc.
  const parts = s.split(/[/.-]/);
  if (parts.length >= 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (Number.isNaN(p0) || Number.isNaN(p1) || Number.isNaN(p2)) return null;
    // Year in p2 (DD/MM/YYYY or DD.MM.YYYY): p2 is year
    if (p2 >= 1000) return new Date(p2, p1 - 1, p0);
    // YYYY-MM-DD: p0 is year
    if (p0 >= 1000) return new Date(p0, p1 - 1, p2);
    // 2-digit year DD/MM/YY
    if (p2 >= 0 && p2 <= 99) {
      const year = p2 >= 50 ? 1900 + p2 : 2000 + p2;
      return new Date(year, p1 - 1, p0);
    }
    // p0 > 31 means p0 is year (YYYY-DD-MM or similar)
    if (p0 > 31 && p2 <= 31) return new Date(p0, p1 - 1, p2);
  }
  // Two parts: D/M or DD.MM → assume current year
  if (parts.length === 2) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    if (!Number.isNaN(p0) && !Number.isNaN(p1) && p1 >= 1 && p1 <= 12 && p0 >= 1 && p0 <= 31) {
      const y = new Date().getFullYear();
      return new Date(y, p1 - 1, p0);
    }
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

/**
 * Format order/invoice date for display as yyyy/mm/dd (e.g. order selection page).
 */
export function formatOrderDateYMD(ivdate: string | undefined | null): string {
  const d = parseOrderDate(ivdate);
  if (!d) return ivdate != null ? String(ivdate) : "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/**
 * Format order/invoice date for display as mm/dd/yyyy (order card).
 */
export function formatOrderDateMD(ivdate: string | undefined | null): string {
  const d = parseOrderDate(ivdate);
  if (!d) return ivdate != null ? String(ivdate) : "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format number for display: at most 2 decimal places (e.g. 27.41).
 * Use for all currency and decimal display to avoid floating-point noise.
 * Rounds then formats with he-IL locale; max 2 digits after decimal.
 */
export function formatMoney(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

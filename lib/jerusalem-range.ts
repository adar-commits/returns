/** Calendar YYYY-MM-DD in Asia/Jerusalem for instant `d`. */
export function ymdInJerusalem(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}

/** First instant (UTC) that falls on calendar day `ymd` in Jerusalem. */
export function jerusalemDayStart(ymd: string): Date {
  const [Y, M, D] = ymd.split("-").map(Number);
  const lo = Date.UTC(Y, M - 1, D - 2);
  const hi = Date.UTC(Y, M - 1, D + 2);
  let first = hi;
  for (let t = lo; t <= hi; t += 60000) {
    if (ymdInJerusalem(new Date(t)) === ymd) {
      first = t;
      break;
    }
  }
  let t = first;
  while (t > lo && ymdInJerusalem(new Date(t - 1)) === ymd) t -= 1;
  return new Date(t);
}

/** Start of the next calendar day after `ymd` in Jerusalem. */
export function jerusalemNextDayStart(ymd: string): Date {
  const start = jerusalemDayStart(ymd).getTime();
  for (let h = 20; h <= 28; h++) {
    const candidate = ymdInJerusalem(new Date(start + h * 3600000));
    if (candidate !== ymd) return jerusalemDayStart(candidate);
  }
  return new Date(start + 24 * 3600000);
}

function weekdayIndexJerusalem(d: Date): number {
  // 0 Sun .. 6 Sat in Jerusalem
  const s = d.toLocaleDateString("en-US", { timeZone: "Asia/Jerusalem", weekday: "short" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[s] ?? 0;
}

export type DatePreset = "yesterday" | "today" | "week" | "month" | "year";

export function resolvePresetRange(preset: DatePreset, now = new Date()): { from: Date; toExclusive: Date } {
  const todayYmd = ymdInJerusalem(now);
  const todayStart = jerusalemDayStart(todayYmd);
  const tomorrowStart = jerusalemNextDayStart(todayYmd);

  if (preset === "today") {
    return { from: todayStart, toExclusive: tomorrowStart };
  }
  if (preset === "yesterday") {
    const yesterdayYmd = ymdInJerusalem(new Date(todayStart.getTime() - 1));
    return { from: jerusalemDayStart(yesterdayYmd), toExclusive: todayStart };
  }
  if (preset === "week") {
    let t = todayStart.getTime();
    while (weekdayIndexJerusalem(new Date(t)) !== 0) t -= 3600000;
    const weekStart = jerusalemDayStart(ymdInJerusalem(new Date(t)));
    return { from: weekStart, toExclusive: tomorrowStart };
  }
  if (preset === "month") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    const y = parts.find((p) => p.type === "year")!.value;
    const m = parts.find((p) => p.type === "month")!.value;
    const monthStart = jerusalemDayStart(`${y}-${m}-01`);
    const nextMonth = Number(m) === 12 ? `${Number(y) + 1}-01-01` : `${y}-${String(Number(m) + 1).padStart(2, "0")}-01`;
    return { from: monthStart, toExclusive: jerusalemDayStart(nextMonth) };
  }
  // year
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric" }).format(now);
  return {
    from: jerusalemDayStart(`${y}-01-01`),
    toExclusive: jerusalemDayStart(`${Number(y) + 1}-01-01`),
  };
}

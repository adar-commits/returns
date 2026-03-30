"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./backoffice.module.css";
import {
  RETURN_STATUS_HE,
  RETURN_TYPE_HE,
  STAFF_HANDLING_HE,
  formatIls,
} from "@/lib/staff-backoffice-he";
import type { ReturnRequestItem } from "@/lib/db-types";

type ListRow = {
  return_id: string;
  reference_code: string;
  order_id: string;
  phone: string;
  branch_id: string | null;
  status: string;
  staff_handling: string | null;
  type: string;
  items: ReturnRequestItem[];
  amount_refund: number;
  amount_to_pay: number;
  shipping_fee: number;
  customer_address: { full_name?: string } | null;
  webhook_payload: Record<string, unknown> | null;
  created_at: string;
};

const PRESETS = [
  { id: "yesterday", label: "אתמול" },
  { id: "today", label: "היום" },
  { id: "week", label: "השבוע" },
  { id: "month", label: "החודש" },
  { id: "year", label: "השנה" },
  { id: "custom", label: "מותאם" },
] as const;

const HANDLING_OPTIONS = [
  { id: "open" as const, label: "פתוח" },
  { id: "in_progress" as const, label: "בטיפול" },
  { id: "completed" as const, label: "הושלם" },
];

const DEFAULT_HANDLING = new Set<string>(["open", "in_progress"]);

function handlingSetFromSearchParams(sp: URLSearchParams): Set<string> {
  const raw = sp.get("handling");
  if (raw === "all") return new Set();
  if (raw == null || raw === "") return new Set(DEFAULT_HANDLING);
  const next = new Set<string>();
  for (const part of raw.split(",")) {
    const p = part.trim();
    if (p === "open" || p === "in_progress" || p === "completed") next.add(p);
  }
  return next.size > 0 ? next : new Set();
}

function serializeHandlingParam(selected: Set<string>): string | null {
  if (selected.size === 0) return "all";
  const order = ["open", "in_progress", "completed"] as const;
  const parts = order.filter((id) => selected.has(id));
  if (parts.length === 0) return "all";
  const isDefault =
    parts.length === 2 && selected.has("open") && selected.has("in_progress") && !selected.has("completed");
  if (isDefault) return null;
  return parts.join(",");
}

function typePillClass(type: string): string {
  if (type === "return") return styles.typePillReturn;
  if (type === "replacement") return styles.typePillReplace;
  return styles.typePillMixed;
}

function displayName(row: ListRow): string {
  const a = row.customer_address?.full_name?.trim();
  if (a) return a;
  const p = row.webhook_payload?.customer as { full_name?: string } | undefined;
  const w = p?.full_name?.trim();
  if (w) return w;
  return "—";
}

function createdDaysLabel(iso: string): string {
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "נוצר היום";
  if (days === 1) return "נוצר לפני יום אחד";
  return `נוצר לפני ${days} ימים`;
}

function statusBadgeClass(status: string): string {
  if (status === "awaiting_payment") return styles.badgeYellow;
  if (status === "refunded" || status === "delivered") return styles.badgeBrand;
  return styles.badgeMuted;
}

function staffBadgeClass(h: string | null): string | null {
  if (!h) return null;
  if (h === "completed") return styles.badgeBrand;
  if (h === "in_progress") return styles.badgeBlue;
  return styles.badgeMuted;
}

type DiffKind = "pay" | "refund" | "neutral";

function lineMoney(it: ReturnRequestItem): { text: string; kind: DiffKind } {
  const paid = it.price != null ? Number(it.price) : null;
  if (it.action === "return") {
    if (paid != null && paid > 0) return { text: `${formatIls(paid)} זיכוי`, kind: "refund" };
    return { text: "—", kind: "neutral" };
  }
  const newP = it.size_price != null ? Number(it.size_price) : null;
  if (paid != null && newP != null) {
    const d = newP - paid;
    if (d > 0) return { text: `+${formatIls(d)}`, kind: "pay" };
    if (d < 0) return { text: `−${formatIls(-d)}`, kind: "refund" };
    return { text: formatIls(0), kind: "neutral" };
  }
  if (newP != null) return { text: formatIls(newP), kind: "neutral" };
  return { text: "—", kind: "neutral" };
}

function itemQty(it: ReturnRequestItem): number {
  const q = (it as { qty?: number }).qty;
  return typeof q === "number" && q > 0 ? q : 1;
}

function newItemLabel(it: ReturnRequestItem): string {
  if (it.action !== "replace") return "—";
  const label = it.size_label?.trim();
  if (label) return label;
  if (it.selected_size_id?.trim()) return it.selected_size_id.trim();
  return "—";
}

type ItemsDetailEntry = {
  sku?: string;
  reason_text?: string | null;
};

function itemDetail(row: ListRow, it: ReturnRequestItem): ItemsDetailEntry | undefined {
  const details = row.webhook_payload?.items_detail as ItemsDetailEntry[] | undefined;
  if (!details?.length || !row.items?.length) return undefined;
  const origIdx = row.items.indexOf(it);
  if (origIdx >= 0 && details.length === row.items.length) return details[origIdx];
  return details.find((d) => String(d.sku ?? "") === it.sku);
}

function returnReasonCell(it: ReturnRequestItem, row: ListRow): string {
  const t = itemDetail(row, it)?.reason_text?.trim();
  if (t) return t;
  if (it.reason_id != null && String(it.reason_id).trim() !== "") return `קוד ${it.reason_id}`;
  return "—";
}

function returnCreditOnly(it: ReturnRequestItem): { text: string; kind: DiffKind } {
  const paid = it.price != null ? Number(it.price) : null;
  if (paid != null && paid > 0) return { text: formatIls(paid), kind: "refund" };
  return { text: "—", kind: "neutral" };
}

function productTitle(it: ReturnRequestItem): string {
  return it.product_name?.trim() || it.sku;
}

function MoneyCell({ money }: { money: { text: string; kind: DiffKind } }) {
  return (
    <span
      className={
        money.kind === "pay" ? styles.moneyPay : money.kind === "refund" ? styles.moneyRefund : styles.moneyNeutral
      }
    >
      {money.text}
    </span>
  );
}

function RequestCardItemsTable({ row }: { row: ListRow }) {
  const all = row.items || [];
  const returnItems = all.filter((i) => i.action === "return");
  const replaceItems = all.filter((i) => i.action === "replace");
  const hasAny = returnItems.length > 0 || replaceItems.length > 0;

  if (!hasAny) {
    return (
      <table className={styles.itemsTable}>
        <tbody>
          <tr>
            <td colSpan={4} className={styles.itemsEmpty}>
              אין פריטים ברשומה
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <>
      {returnItems.length > 0 ? (
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>פריט מוחזר</th>
              <th>כמות</th>
              <th>סיבת החזרה</th>
              <th>זיכוי כספי</th>
            </tr>
          </thead>
          <tbody>
            {returnItems.map((it, j) => {
              const money = returnCreditOnly(it);
              return (
                <tr key={`ret-${it.sku}-${j}`}>
                  <td>{productTitle(it)}</td>
                  <td>{itemQty(it)}</td>
                  <td>{returnReasonCell(it, row)}</td>
                  <td>
                    <MoneyCell money={money} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
      {replaceItems.length > 0 ? (
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>פריט מוחלף</th>
              <th>מידה חדשה</th>
              <th>כמות</th>
              <th>הפרש כספי</th>
            </tr>
          </thead>
          <tbody>
            {replaceItems.map((it, j) => {
              const money = lineMoney(it);
              return (
                <tr key={`rep-${it.sku}-${j}`}>
                  <td>{productTitle(it)}</td>
                  <td>{newItemLabel(it)}</td>
                  <td>{itemQty(it)}</td>
                  <td>
                    <MoneyCell money={money} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

function RequestsSkeleton() {
  return (
    <div className={styles.cardGrid} aria-busy="true" aria-label="טוען בקשות">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonPill} />
          <div className={styles.skeletonLineWide} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonTable} />
        </div>
      ))}
    </div>
  );
}

export default function StaffRequestsPageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDraft, setSearchDraft] = useState("");

  const preset = sp.get("preset") || "";
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const q = sp.get("q") || "";

  const activePreset = useMemo(() => {
    if (preset && PRESETS.some((p) => p.id === preset)) return preset;
    if (from && to) return "custom";
    return "week";
  }, [preset, from, to]);

  const handlingSelected = useMemo(() => handlingSetFromSearchParams(sp), [sp]);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const hasAny = sp.get("preset") || sp.get("from") || sp.get("to");
    if (!hasAny) {
      const n = new URLSearchParams(sp.toString());
      n.set("preset", "week");
      router.replace(`/staff/requests?${n}`, { scroll: false });
    }
  }, [router, sp]);

  const buildApiQuery = useCallback(() => {
    const qs = new URLSearchParams();
    const p = sp.get("preset");
    const f = sp.get("from");
    const t = sp.get("to");
    const qq = sp.get("q");
    if (p && p !== "custom") qs.set("preset", p);
    if (p === "custom" && f && t) {
      qs.set("from", f);
      qs.set("to", t);
      qs.set("preset", "custom");
    }
    if (!p && f && t) {
      qs.set("from", f);
      qs.set("to", t);
    }
    if (qq) qs.set("q", qq);
    const h = sp.get("handling");
    if (h === "all") qs.set("handling", "all");
    else if (h) qs.set("handling", h);
    return qs.toString();
  }, [sp]);
 
  const toggleHandling = (id: string) => {
    const n = new Set(handlingSelected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    const param = serializeHandlingParam(n);
    setParams({ handling: param });
  };

  useEffect(() => {
    const qs = buildApiQuery();
    setLoading(true);
    fetch(`/api/staff/requests?${qs}`)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/staff/login";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.requests) setRows(d.requests);
        else if (d?.error) setRows([]);
      })
      .finally(() => setLoading(false));
  }, [buildApiQuery, sp]);

  const setParams = (updates: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v == null || v === "") n.delete(k);
      else n.set(k, v);
    });
    router.push(`/staff/requests?${n}`, { scroll: false });
  };

  const onPresetClick = (id: string) => {
    if (id === "custom") {
      setParams({ preset: "custom", from: from || "", to: to || "" });
      return;
    }
    setParams({ preset: id, from: null, to: null });
  };

  const applyCustomDates = () => {
    if (!from || !to) return;
    setParams({ preset: "custom", from, to });
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ q: searchDraft.trim() || null });
  };

  return (
    <>
      <h1 className={styles.pageTitle}>כל בקשות ההחזרה וההחלפה</h1>

      <form onSubmit={submitSearch}>
        <input
          className={styles.search}
          dir="rtl"
          placeholder="חיפוש חופשי לפי שם לקוח, טלפון, הזמנה או מס׳ בקשה"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          aria-label="חיפוש"
        />
      </form>

      <div className={styles.handlingRow} role="group" aria-label="סינון לפי סטטוס טיפול">
        <span className={styles.handlingLabel}>סטטוס טיפול בקשה</span>
        <div className={styles.handlingChips}>
          {HANDLING_OPTIONS.map(({ id, label }) => (
            <label key={id} className={styles.handlingChip}>
              <input type="checkbox" checked={handlingSelected.has(id)} onChange={() => toggleHandling(id)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.segmentWrap} role="tablist" aria-label="טווח תאריכים">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activePreset === id}
            className={`${styles.segmentBtn} ${activePreset === id ? styles.segmentBtnActive : ""}`}
            onClick={() => onPresetClick(id)}
          >
            {id === "custom" ? (
              <>
                <span aria-hidden>📅</span> {label}
              </>
            ) : (
              label
            )}
          </button>
        ))}
      </div>

      {activePreset === "custom" && (
        <div className={styles.customDates}>
          <label>
            מתאריך
            <input
              type="date"
              value={from}
              onChange={(e) => setParams({ preset: "custom", from: e.target.value, to: to || e.target.value })}
            />
          </label>
          <label>
            עד תאריך
            <input
              type="date"
              value={to}
              onChange={(e) => setParams({ preset: "custom", from: from || e.target.value, to: e.target.value })}
            />
          </label>
          <button type="button" className={styles.customApplyBtn} onClick={applyCustomDates} disabled={!from || !to}>
            החל טווח
          </button>
        </div>
      )}

      {loading ? (
        <RequestsSkeleton />
      ) : rows.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyCardText}>אין בקשות בתצוגה זו</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {rows.map((row, i) => (
            <Link
              key={row.return_id}
              href={`/staff/requests/${encodeURIComponent(row.reference_code || row.return_id)}`}
              className={styles.requestCard}
              style={{ animationDelay: `${Math.min(i, 12) * 55}ms` }}
            >
              <div className={styles.cardTopBar}>
                <span className={styles.agePill}>{createdDaysLabel(row.created_at)}</span>
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${statusBadgeClass(row.status)}`}>
                    {RETURN_STATUS_HE[row.status] || row.status}
                  </span>
                  {row.staff_handling ? (
                    <span className={`${styles.badge} ${staffBadgeClass(row.staff_handling) || ""}`}>
                      {STAFF_HANDLING_HE[row.staff_handling] || row.staff_handling}
                    </span>
                  ) : null}
                </div>
              </div>

              <dl className={styles.fieldList}>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>מספר בקשה</dt>
                  <dd className={styles.fieldValue} dir="ltr">
                    {row.reference_code || "—"}
                  </dd>
                </div>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>תאריך-שעה</dt>
                  <dd className={styles.fieldValue}>
                    {new Date(row.created_at).toLocaleString("he-IL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </dd>
                </div>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>הזמנה</dt>
                  <dd className={styles.fieldValue} dir="ltr">
                    {row.order_id}
                  </dd>
                </div>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>שם הלקוח</dt>
                  <dd className={styles.fieldValue}>{displayName(row)}</dd>
                </div>
                <div className={styles.fieldRow}>
                  <dt className={styles.fieldLabel}>סוג הבקשה</dt>
                  <dd className={styles.fieldValuePillCell}>
                    <span className={`${styles.typePill} ${typePillClass(row.type)}`}>
                      {RETURN_TYPE_HE[row.type] || row.type}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className={styles.itemsBlock}>
                <RequestCardItemsTable row={row} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

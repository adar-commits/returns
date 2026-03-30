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

function displayName(row: ListRow): string {
  const a = row.customer_address?.full_name?.trim();
  if (a) return a;
  const p = row.webhook_payload?.customer as { full_name?: string } | undefined;
  const w = p?.full_name?.trim();
  if (w) return w;
  return "—";
}

function statusBadgeClass(status: string): string {
  if (status === "awaiting_payment") return styles.badgeYellow;
  if (status === "refunded" || status === "delivered") return styles.badgeGreen;
  return styles.badgeMuted;
}

function staffBadgeClass(h: string | null): string | null {
  if (!h) return null;
  if (h === "completed") return styles.badgeGreen;
  if (h === "in_progress") return styles.badgeBlue;
  return styles.badgeMuted;
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
    return "today";
  }, [preset, from, to]);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const hasAny = sp.get("preset") || sp.get("from") || sp.get("to");
    if (!hasAny) {
      const n = new URLSearchParams(sp.toString());
      n.set("preset", "today");
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
    return qs.toString();
  }, [sp]);

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
      <h1 className={styles.pageTitle}>כל בקשות ההחזרה</h1>
      <p className={styles.subtitle}>סינון לפי תאריך יצירה (שעון ישראל) וחיפוש לפי טלפון, שם, מספר הזמנה או מזהה בקשה</p>

      <form onSubmit={submitSearch}>
        <input
          className={styles.search}
          dir="rtl"
          placeholder="הזן טלפון, שם, מספר הזמנה או מזהה בקשה"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          aria-label="חיפוש"
        />
      </form>

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
          <button type="button" className="btn btn-primary" onClick={applyCustomDates} disabled={!from || !to}>
            החל טווח
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-block">
          <div className="loader" />
          <span>טוען…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>אין בקשות בתצוגה זו</p>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {rows.map((row) => (
            <Link key={row.return_id} href={`/staff/requests/${encodeURIComponent(row.return_id)}`} className={styles.requestCard}>
              <div className={styles.cardHeader}>
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
                <h2 className={styles.cardName}>{displayName(row)}</h2>
              </div>
              <table className={styles.miniTable}>
                <thead>
                  <tr>
                    <th>מחיר</th>
                    <th>פרטים</th>
                    <th>כמות</th>
                  </tr>
                </thead>
                <tbody>
                  {(row.items || []).slice(0, 4).map((it, i) => (
                    <tr key={`${it.sku}-${i}`}>
                      <td>{it.price != null ? formatIls(Number(it.price)) : "—"}</td>
                      <td>{it.product_name || it.sku}</td>
                      <td>1</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 700 }}>
                      {row.amount_to_pay > 0
                        ? formatIls(row.amount_to_pay)
                        : row.amount_refund > 0
                          ? formatIls(row.amount_refund)
                          : "—"}
                    </td>
                    <td colSpan={2} style={{ fontWeight: 700 }}>
                      {row.amount_to_pay > 0 ? "סה״כ לתשלום" : row.amount_refund > 0 ? "סה״כ זיכוי" : "סה״כ"}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.cardMeta}>
                <div className={styles.cardMetaRow}>
                  <span>תאריך</span>
                  <span>{new Date(row.created_at).toLocaleDateString("he-IL")}</span>
                </div>
                <div className={styles.cardMetaRow}>
                  <span>הזמנה</span>
                  <span dir="ltr" style={{ textAlign: "left" }}>
                    {row.order_id}
                  </span>
                </div>
                <div className={styles.cardMetaRow}>
                  <span>טלפון</span>
                  <span dir="ltr" style={{ textAlign: "left" }}>
                    {row.phone}
                  </span>
                </div>
                <div className={styles.cardMetaRow}>
                  <span>סוג</span>
                  <span>{RETURN_TYPE_HE[row.type] || row.type}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = { sku: string; product_name?: string; price?: number; [key: string]: unknown };
type ItemChoice = { sku: string; action: "return" | "replace"; reason_id?: string; selected_size_id?: string; size_label?: string; size_price?: number };
type SizeOption = { id: string; label?: string; price?: number };

export default function ItemSelection({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<{ items?: LineItem[]; [key: string]: unknown } | null>(null);
  const [returnReasons, setReturnReasons] = useState<string[]>([]);
  const [choices, setChoices] = useState<ItemChoice[]>([]);
  const [sizesCache, setSizesCache] = useState<Record<string, SizeOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([ordersData, settingsData]) => {
      const orders = ordersData.orders || [];
      const found = orders.find((o: { order_id?: string }) => String(o.order_id) === orderId);
      setOrder(found || null);
      setReturnReasons(settingsData.return_reasons || []);
      const items = (found?.items || found?.line_items || []) as LineItem[];
      setChoices(items.map((it) => ({ sku: it.sku || "", action: "return" as const, reason_id: "", selected_size_id: "" })));
    }).finally(() => setLoading(false));
  }, [orderId]);

  const fetchSizes = async (sku: string) => {
    if (sizesCache[sku]) return;
    const res = await fetch("/api/sizes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku }) });
    const data = await res.json();
    setSizesCache((prev) => ({ ...prev, [sku]: data.sizes || [] }));
  };

  const setChoice = (index: number, update: Partial<ItemChoice>) => {
    setChoices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  };

  const handleContinue = () => {
    setSending(true);
    const wizard = {
      orderId,
      order,
      choices,
      step: "items",
    };
    sessionStorage.setItem("returns_wizard", JSON.stringify(wizard));
    router.push(`/shipping?orderId=${encodeURIComponent(orderId)}`);
    setSending(false);
  };

  if (loading || !order) return <div className="loading-block"><div className="loader" /><span>טוען…</span></div>;

  const items = (order.items || order.line_items || []) as LineItem[];
  if (items.length === 0) return <div className="card"><p style={{ margin: 0, color: "var(--color-text-muted)" }}>לא נמצאו פריטים.</p></div>;

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="card">
          <p style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-body)" }}><strong>{item.product_name || item.sku || "פריט"}</strong> {item.price != null && <span style={{ color: "var(--color-text-muted)" }}>— {item.price} ₪</span>}</p>
          <div className="input-wrap">
            <label className="input-label">החזרה או החלפה</label>
            <select
              className="input"
              value={choices[i]?.action || "return"}
              onChange={(e) => {
                const action = e.target.value as "return" | "replace";
                setChoice(i, { action, reason_id: undefined, selected_size_id: undefined });
                if (action === "replace") fetchSizes(item.sku || "");
              }}
            >
              <option value="return">החזרה</option>
              <option value="replace">החלפה</option>
            </select>
          </div>
          {choices[i]?.action === "return" && (
            <div className="input-wrap">
              <label className="input-label">סיבת ההחזרה</label>
              <select
                className="input"
                value={choices[i].reason_id ?? ""}
                onChange={(e) => setChoice(i, { reason_id: e.target.value })}
              >
                <option value="">בחר סיבה</option>
                {returnReasons.map((r, j) => (
                  <option key={j} value={String(j)}>{r}</option>
                ))}
              </select>
            </div>
          )}
          {choices[i]?.action === "replace" && (
            <div className="input-wrap">
              <label className="input-label">גודל / אפשרות</label>
              <select
                className="input"
                value={choices[i].selected_size_id ?? ""}
                onChange={(e) => {
                  const opt = sizesCache[item.sku || ""]?.find((s) => s.id === e.target.value);
                  setChoice(i, {
                    selected_size_id: e.target.value,
                    size_label: opt?.label,
                    size_price: opt?.price,
                  });
                }}
                onFocus={() => fetchSizes(item.sku || "")}
              >
                <option value="">בחר גודל</option>
                {(sizesCache[item.sku || ""] || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.label || s.id} {s.price != null ? `— ${s.price} ₪` : ""}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={sending}>
        {sending ? "שולח…" : "המשך למשלוח ואיסוף"}
      </button>
    </div>
  );
}

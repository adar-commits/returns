"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

const COPY: Record<string, string> = {
  settings_admin_only: "ההגדרות זמינות רק למנהלים. אתם מחוברים כעת עם תפקיד שלא כולל גישה לשם.",
};

export default function StaffFlashMessage() {
  const sp = useSearchParams();
  const text = useMemo(() => {
    const key = sp.get("message");
    return key ? COPY[key] || null : null;
  }, [sp]);
  if (!text) return null;
  return (
    <div
      className="staff-flash-msg"
      style={{
        marginBottom: "var(--bo-space-4, 1rem)",
        padding: "var(--bo-space-3, 0.75rem) var(--bo-space-4, 1rem)",
        borderRadius: 14,
        background: "#fff1f2",
        border: "1px solid #fecdd3",
        color: "#881337",
        fontSize: "0.875rem",
        lineHeight: 1.5,
      }}
      role="status"
    >
      {text}
    </div>
  );
}

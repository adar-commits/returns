"use client";

type StartOverLinkProps = {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** Clears wizard state + customer session, then returns to the phone login screen. */
export default function StartOverLink({ className, style, children }: StartOverLinkProps) {
  return (
    <button
      type="button"
      className={className ?? "link"}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
        textDecoration: "underline",
        ...style,
      }}
      onClick={async () => {
        sessionStorage.clear();
        try {
          await fetch("/api/auth/reset", { method: "POST" });
        } catch (_) {}
        window.location.href = "/";
      }}
    >
      {children}
    </button>
  );
}

import { getSettings } from "@/lib/settings";
import { DEFAULT_LOGO_URL } from "@/lib/constants";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const helpBanner = settings?.content_help_banner as { text?: string; href?: string } | null;
  const banner = settings?.content_banner as string | null;
  const footer = settings?.content_footer as string | null;
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || DEFAULT_LOGO_URL;

  return (
    <div className="customer-flow" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header style={{ padding: "var(--space-4) var(--space-4) var(--space-2)", textAlign: "center", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-elevated)", boxShadow: "0 1px 0 var(--color-border)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="Logo" style={{ maxHeight: 48, height: "auto", objectFit: "contain" }} />
        <p style={{ margin: "var(--space-2) 0 0", fontSize: "var(--text-subtitle)", fontWeight: 600, color: "var(--color-text)" }}>
          פורטל החלפות והחזרות לשירותכם
        </p>
      </header>
      {banner && <div className="content-banner">{banner}</div>}
      <div style={{ flex: 1 }}>{children}</div>
      {helpBanner?.text && (
        <div className="help-block">
          <p>{helpBanner.text}</p>
          {helpBanner.href && (
            <a href={helpBanner.href} target="_blank" rel="noopener noreferrer" className="link">
              צור קשר
            </a>
          )}
        </div>
      )}
      {footer && <footer className="footer-block">{footer}</footer>}
    </div>
  );
}

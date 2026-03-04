import { getSettings } from "@/lib/settings";
import { DEFAULT_LOGO_URL } from "@/lib/constants";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const helpBanner = settings?.content_help_banner as { text?: string; href?: string } | null;
  const helpHref = helpBanner?.href?.trim() || "https://wa.me/972779725055?text=%D7%94%D7%99%D7%99";
  const banner = settings?.content_banner as string | null;
  const footer = settings?.content_footer as string | null;
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || DEFAULT_LOGO_URL;

  return (
    <div className="customer-flow" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header className="customer-header" style={{
        padding: "var(--space-4) var(--space-4) var(--space-3)",
        paddingTop: "calc(var(--space-4) + env(safe-area-inset-top, 0px))",
        paddingLeft: "calc(var(--space-4) + env(safe-area-inset-left, 0px))",
        paddingRight: "calc(var(--space-4) + env(safe-area-inset-right, 0px))",
        textAlign: "center",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-elevated)",
        boxShadow: "0 1px 0 var(--color-border)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="Logo" className="customer-header-logo" />
        <p className="customer-header-title">
          פורטל החלפות והחזרות לשירותכם
        </p>
      </header>
      {banner && <div className="content-banner">{banner}</div>}
      <main className="customer-main">{children}</main>
      {helpBanner?.text && (
        <div className="help-block">
          <a href={helpHref} target="_blank" rel="noopener noreferrer" className="help-block-link">
            {helpBanner.text.trim()} לחצו כאן לשיחת WhatsApp
          </a>
        </div>
      )}
      {footer && <footer className="footer-block">{footer}</footer>}
    </div>
  );
}

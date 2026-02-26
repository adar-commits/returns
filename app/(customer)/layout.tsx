import { getSettings } from "@/lib/settings";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const helpBanner = settings?.content_help_banner as { text?: string; href?: string } | null;
  const banner = settings?.content_banner as string | null;
  const footer = settings?.content_footer as string | null;

  return (
    <div className="customer-flow">
      {banner && (
        <div className="content-banner" style={{ padding: "8px 16px", background: "#f5f0eb", textAlign: "center", fontSize: 14 }}>
          {banner}
        </div>
      )}
      {children}
      {helpBanner?.text && (
        <div style={{ padding: 24, background: "#f5f0eb", marginTop: 32, textAlign: "center" }}>
          <p style={{ marginBottom: 8 }}>{helpBanner.text}</p>
          {helpBanner.href && (
            <a href={helpBanner.href} target="_blank" rel="noopener noreferrer" style={{ color: "#8B4513", fontWeight: 600 }}>
              צור קשר
            </a>
          )}
        </div>
      )}
      {footer && (
        <footer style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#666" }}>
          {footer}
        </footer>
      )}
    </div>
  );
}

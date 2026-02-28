import type { Metadata, Viewport } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";

const notoHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  variable: "--font-noto-hebrew",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9b2d30" },
    { media: "(prefers-color-scheme: dark)", color: "#9b2d30" },
  ],
};

export const metadata: Metadata = {
  title: "מרכז ההחלפות וההחזרות | Returns",
  description: "פורטל החלפות והחזרות — השטיח האדום",
  manifest: "/manifest",
  icons: {
    apple: "/img/HoM_logo.webp",
  },
  formatDetection: {
    telephone: true,
  },
  openGraph: {
    title: "מרכז ההחלפות וההחזרות",
    description: "פורטל החלפות והחזרות — השטיח האדום",
    locale: "he_IL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={notoHebrew.variable}>
      <body className={notoHebrew.className} style={{ fontFamily: "var(--font-noto-hebrew), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

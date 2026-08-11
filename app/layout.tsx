import type { Metadata, Viewport } from "next";
import { Noto_Sans_Hebrew, Open_Sans } from "next/font/google";
import "./globals.css";

/** Brand stack: Open Sans + Noto Sans Hebrew (Google Fonts). */
const notoSans = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-open-sans",
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
    icon: "/img/favicon.png",
    apple: "/img/favicon.png",
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
    <html lang="he" dir="rtl" className={`${notoSans.variable} ${openSans.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-noto-sans), var(--font-open-sans), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}

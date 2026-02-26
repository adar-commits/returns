import type { Metadata } from "next";
import { Noto_Sans_Hebrew } from "next/font/google";
import "./globals.css";

const notoHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  variable: "--font-noto-hebrew",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מרכז ההחלפות וההחזרות | Returns",
  description: "Returns and exchanges hub",
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

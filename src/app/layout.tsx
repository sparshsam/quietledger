import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://openledger-two.vercel.app"),
  title: {
    default: "OpenLedger",
    template: "%s · OpenLedger",
  },
  description: "A private, editorial personal finance ledger.",
  manifest: "/manifest.webmanifest",
  applicationName: "OpenLedger",
  authors: [{ name: "Sparsh Sam", url: "https://github.com/sparshsam" }],
  creator: "Sparsh Sam",
  publisher: "Sparsh Sam",
  category: "finance",
  keywords: [
    "OpenLedger",
    "personal finance",
    "ledger",
    "budget tracker",
    "local-first",
    "privacy",
    "expense tracking",
    "CSV import",
    "self-hosted",
    "PWA",
    "open source",
    "money management",
  ],
  appleWebApp: {
    title: "OpenLedger",
    capable: true,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "OpenLedger",
    description: "A private, editorial personal finance ledger.",
    url: "https://openledger-two.vercel.app",
    siteName: "OpenLedger",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "OpenLedger — a private, editorial personal finance ledger.",
      },
    ],
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "OpenLedger",
    description: "A private, editorial personal finance ledger.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsTracker />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Fraunces, Noto_Serif_SC, IBM_Plex_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const body = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
    : "http://localhost:3460");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CipherLeaf — 为审慎读者准备的加密知识",
  description:
    "零明文托管、数学挑战门禁、短期阅读胶囊，以及公开披露的个体化水印——面向敏感原创写作。",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "CipherLeaf",
    url: "/",
    title: "CipherLeaf — 为审慎读者准备的加密知识",
    description:
      "零明文托管、数学挑战门禁、短期阅读胶囊，以及公开披露的个体化水印——面向敏感原创写作。",
    images: [
      {
        url: "/og-envelope.png",
        width: 1200,
        height: 630,
        alt: "CipherLeaf 封存信封",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CipherLeaf — 为审慎读者准备的加密知识",
    description:
      "零明文托管、数学挑战门禁、短期阅读胶囊，以及公开披露的个体化水印——面向敏感原创写作。",
    images: ["/og-envelope.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col leaf-grid">{children}</body>
    </html>
  );
}

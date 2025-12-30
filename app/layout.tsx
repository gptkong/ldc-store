import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "LDC Store";
const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "基于 Linux DO Credit 的虚拟商品自动发卡平台";

export const metadata: Metadata = {
  title: {
    default: `${siteName} - 自动发卡系统`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: ["自动发卡", "虚拟商品", "Linux DO", "LDC"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

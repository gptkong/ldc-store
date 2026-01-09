import type { Metadata } from "next";
import { cache } from "react";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { Toaster } from "@/components/ui/sonner";
import { getSystemSettings } from "@/lib/actions/system-settings";

// 为什么这样做：同一路由渲染时，layout 的 generateMetadata 与 layout 本体会各自调用一次；用 request 级 memoization 避免重复查库。
const getSystemSettingsCached = cache(getSystemSettings);

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteDescription } = await getSystemSettingsCached();

  return {
    title: {
      default: `${siteName} - 自动发卡系统`,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
  };
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { siteName, siteIcon } = await getSystemSettingsCached();

  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={siteName} siteIcon={siteIcon} />
      <main className="flex-1">{children}</main>
      <Footer siteName={siteName} />
      <Toaster position="top-center" richColors />
    </div>
  );
}

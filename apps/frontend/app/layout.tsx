import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { UpdateAvailableBanner } from "@/components/pwa/UpdateAvailableBanner";
import { ServiceWorkerManager } from "@/components/pwa/ServiceWorkerManager";
import { EdgeSwipeGuard } from "@/components/pwa/EdgeSwipeGuard";

// Next.js'in kendi otomatik viewport meta enjeksiyonunu devre dışı bırakıp
// buradan tek, kesin bir viewport tanımlar — iki çakışan <meta viewport>
// etiketi (biri kısıtlayıcı, biri Next'in varsayılanı) tarayıcıların zoom
// davranışını tutarsız uygulamasına neden oluyordu.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SİSMİK · Kurumsal Operasyon Sistemi",
  description: "İş emirleri, mağaza projeleri ve saha raporları için kurumsal operasyon sistemi.",
  applicationName: "SİSMİK",
  appleWebApp: {
    title: "SİSMİK",
    capable: true,
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <ServiceWorkerManager />
        <EdgeSwipeGuard />
        <UpdateAvailableBanner />
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/permissions";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import type { BrandTone } from "@/components/brand/brand-mark";
import { LaunchScreen } from "@/components/brand/launch-screen";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  brandTone?: BrandTone;
}

export function RoleGuard({
  allowedRoles,
  children,
  brandTone = "red",
}: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ADMIN her panele erişebilir (superuser)
  const hasAccess = !!user && (user.role === "ADMIN" || allowedRoles.includes(user.role));
  const authResolved = !isLoading && isAuthenticated && !!user && hasAccess;

  // React Hook Kuralları: tüm hook'lar koşulsuz, hiçbir early return'ün
  // ARDINDAN değil önünde çağrılır. Aşağıdaki effect'in gövdesi zaten yalnızca
  // tarayıcıda çalışır (React SSR'da effect body'lerini yürütmez).
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (getTokenPayloadFromStorage()?.force_password_change) {
      window.location.href = "/password-reset";
      return;
    }
    if (!hasAccess) {
      window.location.href = "/403";
    }
  }, [isLoading, isAuthenticated, hasAccess]);

  // Sunucu (SSR) / hydrate öncesi: geçerli oturum varsa doğrudan açılış ekranı
  // çizilir — giriş yapmış kullanıcı için önce boşluk/iskelet değil DOĞRUDAN
  // logo ekranı görünür.
  if (typeof window === "undefined") {
    return <LaunchScreen tone={brandTone} />;
  }

  // Oturum kontrolü sürerken (veya yetkisizken → yukarıdaki redirect effect'i
  // çalışır) TEK bir "Oturum kontrol ediliyor" ekranı gösterilir. Masraf
  // uygulamasındaki gibi: SABİT/yapay bir bekleme SÜRESİ YOKTUR — kontrol
  // biter bitmez içeriğe geçilir. Sismik'te oturum JWT'den anında çözüldüğü
  // için bu ekran yalnızca çok kısa bir an görünür; ardından sayfa mount olup
  // güncel verisini çeker (her sayfa kendi yükleniyor/iskelet durumunu gösterir).
  if (!mounted || !authResolved) {
    // Oturum yoksa (login'e yönleniyor) sessizce null dönülür, splash gösterilmez.
    const hasToken = typeof window !== "undefined" && (!!localStorage.getItem("token") || !!localStorage.getItem("auth_store"));
    if (mounted && !hasToken) return null;
    return <LaunchScreen tone={brandTone} />;
  }

  return <>{children}</>;
}

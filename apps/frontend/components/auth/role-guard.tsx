"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/permissions";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { BrandMark, type BrandTone } from "@/components/brand/brand-mark";

const SPLASH_SESSION_KEY = "sismik-intro:v2:session";
const SPLASH_DURATION_MS = 3600;

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  brandTone?: BrandTone;
}

/**
 * Nötr kapanış katmanı — auth durumu (loading VEYA henüz doğrulanmamış/
 * yetkisiz, redirect effect'i tetiklenene kadar) çözülene kadar gösterilir.
 * Splash ANİMASYONU DEĞİLDİR: sadece statik logo, hafif nabız.
 */
function BootScreen({ tone }: { tone: BrandTone }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#09111b]">
      <BrandMark tone={tone} className="h-16 w-16 animate-pulse" />
    </div>
  );
}

/** Sadece uygulama gerçekten yeni açıldığında (cold launch/refresh) gösterilen
 * logo açılış animasyonu. Route içi geçişlerde tekrar mount edilmez. */
function SplashScreen({ tone }: { tone: BrandTone }) {
  return (
    <div
      className="erp-launch-screen"
      aria-label="SİSMİK Kurumsal Operasyon Sistemi açılıyor"
      aria-live="polite"
    >
      <div className="erp-launch-ambient" />
      <div className="relative flex flex-col items-center">
        <BrandMark tone={tone} animated className="h-28 w-28 sm:h-32 sm:w-32" />
        <div className="erp-launch-wordmark mt-5 text-center">
          <p className="text-[1.65rem] font-black tracking-[0.3em] text-white">SİSMİK</p>
          <p className="mt-2 text-[10px] font-semibold tracking-[0.22em] text-white/50">KURUMSAL OPERASYON SİSTEMİ</p>
        </div>
      </div>
    </div>
  );
}

function hasShownSplashThisSession(): boolean {
  if (typeof window === "undefined") return true; // SSR: içerik zaten mount edilmeyecek, BootScreen basılır
  try {
    const hasToken = !!localStorage.getItem("token") || !!localStorage.getItem("auth_store");
    // Oturum yoksa (Login ekranında) splash adımı tamamen atlanır
    if (!hasToken) return true;
    return sessionStorage.getItem(SPLASH_SESSION_KEY) === "shown";
  } catch {
    return false;
  }
}

export function RoleGuard({
  allowedRoles,
  children,
  brandTone = "red",
}: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  // Lazy init: sessionStorage senkron olarak ilk render'da okunur — splash'ın
  // kendisi bir "flash" olmasın diye (önce içerik/atlanmış splash görünüp
  // sonra splash'a geçme gibi bir ikinci hataya düşmeyelim).
  const [splashDone, setSplashDone] = useState(hasShownSplashThisSession);

  // ADMIN her panele erişebilir (superuser)
  const hasAccess = !!user && (user.role === "ADMIN" || allowedRoles.includes(user.role));
  const authResolved = !isLoading && isAuthenticated && !!user && hasAccess;

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

  useEffect(() => {
    if (!authResolved || splashDone) return;
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "shown");
    } catch {
      // sessionStorage kullanılamıyorsa (gizli mod vb.) yine de splash'ı göster,
      // sadece bir dahaki route değişiminde tekrar tetiklenmesin diye state yeterli.
    }
    const timer = window.setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [authResolved, splashDone]);

  // Auth yetersiz/loading/oturumsuz ise ve henüz redirect effect tetiklenmediyse
  // arka planda sessizce bekler — ek bir BootScreen/Spinner göstermez.
  // Bu süreçte ekrana hiçbir şey render edilmez (null), doğrudan Login rotası tetiklenir.
  if (!authResolved) return null;

  // Auth tamam ama bu oturumda splash henüz gösterilmedi/tamamlanmadı —
  // gerçek panel (sidebar/dashboard) HENÜZ MOUNT EDİLMEZ.
  if (!splashDone) return <SplashScreen tone={brandTone} />;

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTokenPayloadFromStorage, getRoles, isPlatformAdmin } from "@/lib/auth";
import { AUTH_STORE_KEY } from "@/contexts/auth-context";
import { ROLE_PANEL_HOME, type UserRole } from "@/lib/permissions";
import { LaunchScreen } from "@/components/brand/launch-screen";

function jwtRoleHome(roles: string[]): string {
  if (roles.includes("manager")) return ROLE_PANEL_HOME.MANAGER;
  if (roles.includes("admin")) return ROLE_PANEL_HOME.MANAGER;
  return ROLE_PANEL_HOME.USER;
}

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const payload = getTokenPayloadFromStorage();
    if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
      if (isPlatformAdmin(payload)) {
        router.replace("/platform");
        return;
      }
      router.replace(jwtRoleHome(getRoles(payload)));
      return;
    }

    // Geçersiz veya süresi dolmuş tüm oturum girdilerini kökten temizle.
    // Bu sayede, tarayıcıda kalan eski/stale "auth_store" veya "token" verilerinden dolayı
    // kullanıcının yetkisiz şekilde geçici olarak dashboard'lara yönlendirilmesi (flicker bug'ı) engellenir.
    try {
      localStorage.removeItem(AUTH_STORE_KEY);
      localStorage.removeItem("token");
    } catch {
      // ignore security sandboxes
    }

    router.replace("/login");
  }, [router]);

  // Kök yönlendirme yapılırken de yetkili rotalarla AYNI koyu açılış ekranı
  // gösterilir — böylece PWA soğuk açılışta "önce beyaz kare + spinner,
  // sonra logo animasyonu" çift ekranı yerine tek, kesintisiz animasyon olur.
  return <LaunchScreen tone="red" />;
}

/**
 * apps/frontend/src/middleware.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Next.js Middleware
 *
 * edge runtime: küçük hafızalı sunucularda çalışır
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard"];
const AUTH_PATHS      = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Kamu açısı her zaman erişilebilir
  if (
    AUTH_PATHS.some((p) => pathname.startsWith(p))
    || pathname.startsWith("/api")
    || pathname.startsWith("/_next")
    || pathname.startsWith("/favicon")
    || pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Korumalı yollar için access_token cookie yoksa → login'e yönlendir
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const hasToken = request.cookies.has("access_token");
    if (!hasToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Yenisine cookie eklemek: session cookie ekle ama access token cookie kaldırma
  // Çünkü AuthProvider client-side cookie'yi doğru şekilde set edecektir.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/((?!login|api|_next|favicon.ico).*)"],
};

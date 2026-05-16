/**
 * apps/frontend/src/app/login/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Giriş Sayfası
 *
 * Backend: POST /api/v1/auth/login  (OAuth2PasswordRequestForm)
 * Content-Type: application/x-www-form-urlencoded
 * Dönen: { access_token, refresh_token, token_type }
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState }                                              from "react";
import { useRouter, useSearchParams }                            from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Loader2 }                      from "lucide-react";
import { Button }                                                from "@/components/ui/Button";
import { Input }                                                 from "@/components/ui/Input";
import { useAuth }                                                from "@/contexts/AuthContext";
import { useToast }                                               from "@/contexts/ToastContext";

export default function LoginPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { login, isAuthReady } = useAuth();
  const { toastError, toastSuccess } = useToast();

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [submitErr,   setSubmitErr]   = useState("");

  const redirectTo = searchParams.get("next") ?? "/dashboard";

  // Zaten giriş yapılmışsa dashboard'a yönlendir
  if (isAuthReady) {
    const isLoggedIn = typeof window !== "undefined"
      ? !!localStorage.getItem("access_token")
      : false;
    if (isLoggedIn) {
      if (typeof window !== "undefined") router.replace(redirectTo);
      return null;
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitErr("");

    // ── 前端验证 check (must exist) ───────────────────────────────────────────
    if (!email.trim() || !password.trim()) {
      const msg = "E-posta ve şifre boş bırakılamaz.";
      setSubmitErr(msg);
      toastError("Eksik Bilgi", msg);
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      toastSuccess("Giriş Başarılı", "Yönlendiriliyorsunuz…");
      // Cookie/redirect SWR düzgün çalışsın kısa bir gecikme ver
      setTimeout(() => router.replace(redirectTo), 400);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail   = axiosErr.response?.data?.detail ?? "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.";
      setSubmitErr(detail);
      toastError("Giriş Başarısız", detail);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady) {
    /* ── AuthReady not-setup—don't crash this page with flash of unstarted content  */
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[440px]">
      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 text-white text-2xl font-bold mb-4">
          SM
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Sismik Mekanik ERP</h1>
        <p className="mt-1 text-sm text-gray-500">
          Hesaplarınıza giriş yapın
        </p>
      </div>

      {/* ── Card ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/50 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {/* E-posta */}
          <Input
            id="email"
            type="email"
            label="E-posta"
            placeholder="isim@sirket.com.tr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            icon={<Mail className="h-4.5 w-4.5" />}
          />

          {/* Şifre */}
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                label="Şifre"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                icon={<Lock className="h-4.5 w-4.5" />}
              />
              {password.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Hata mesajı */}
          {submitErr && (
            <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
              {submitErr}
            </p>
          )}

          {/* Giriş butonu */}
          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-medium"
            isLoading={loading}
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </Button>
        </form>

        {/* ── Alt bilgi ─────────────────────────────────────────────────────── */}
        <p className="mt-5 text-center text-xs text-gray-500 leading-relaxed">
          Test kullanıcısı:{' '}
          <span className="font-mono text-gray-700">admin@sismikmekanik.local</span>
          {' / '}
          <span className="font-mono text-gray-700">Admin@2026!</span>
          <br />
          <span className="text-gray-400">(Test amaçlı — production'da değiştirin)</span>
        </p>
      </div>
    </div>
  );
}

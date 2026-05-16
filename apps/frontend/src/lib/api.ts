/**
 * apps/frontend/src/lib/api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Frontend API İstemcisi
 * FastAPI backend (http://localhost:8000) ile tüm istekleri buradan yapar.
 * Her isteğe JWT access_token otomatik eklenir.
 * 401 → refresh_token ile yeniden deneme, başarısız olunca login'e yönlendirir.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const API_BASE =
  (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL
    : undefined) ?? "http://localhost:8000";

/**
 * api — uygulama genelinde kullanılacak tek axios instance.
 * Ortam değişkeninden NEXT_PUBLIC_API_URL okur, yoksa localhost kullanır.
 */
export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// ── Request — her istekte token ekle ──────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // SSR sırasında token ekleme (window yok)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (err) => Promise.reject(err),
);

// ── Response — 401 ise refresh token ile yeniden dene ──────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Sadece bir kez yeniden dene
    if (err.response?.status === 401 && !original._retry && typeof window !== "undefined") {
      original._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${API_BASE}/api/v1/auth/refresh`,
            { refresh_token: refreshToken },
          );
          const newAccess = data.access_token as string;
          localStorage.setItem("access_token", newAccess);

          // Orijinal isteği yeni token ile tekrar gönder
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        } catch {
          // Refresh de başarısız oldu → tüm oturum bilgilerini temizle
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          // Sadece login sayfasındaysak yönlendir (döngü engelle)
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      }
    }

    return Promise.reject(err);
  },
);

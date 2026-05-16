/**
 * apps/frontend/src/contexts/AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sismik Mekanik ERP — Kullanıcı Oturum (Auth) Context
 *
 * Sorumluluklar:
 *  • Oturum açma / çıkma
 *  • Token'ları localStorage + cookie'da tutma (Middleware koruması için)
 *  • Refresh token mekanizması (401 → otomatik yenile → tekrar dene)
 *  • Korumalı sayfalar için `useAuth` hook'u dışa aktarır
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import type { User, Token, Project } from "@/types/api";
import { api }                                        from "@/lib/api";
import {
  createContext, useCallback, useContext,
  useEffect,   useState,    useRef,
} from "react";

/* ── Constants ─────────────────────────────────────────────────────────────── */
const TOKEN_KEY    = "access_token";
const REFRESH_KEY  = "refresh_token";
const USER_KEY     = "user";
const COOKIE_MAX_AGE_DAYS = 1;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    contract_value: asNumber(project.contract_value),
  };
}

/**
 * Token'ı hem localStorage hem de Secure/samesite cookie'ye yazar.
 * Cookie, Next.js Middleware tarafından /dashboard gibi korumalı yolları
 * korumak için kullanılır.
 */
function persistToken(access: string, refresh: string) {
  try {
    localStorage.setItem(TOKEN_KEY,   access);
    localStorage.setItem(REFRESH_KEY, refresh);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(access)}; Path=/; Max-Age=${60 * 60 * 24 * COOKIE_MAX_AGE_DAYS}; SameSite=Lax`;
    document.cookie = `${REFRESH_KEY}=${encodeURIComponent(refresh)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } catch { /* localStorage kapalıysa sessizce geç */ }
}

function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
  try {
    document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${REFRESH_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch { /* ignore */ }
}

/* ── Interface ─────────────────────────────────────────────────────────────── */
interface AuthContextValue {
  user:             User | null;
  token:            string | null;
  isAuthReady:      boolean;
  isAuthenticated:  boolean;
  login:            (email: string, password: string) => Promise<void>;
  logout:           () => void;
  projects:         Project[];
  projectsLoading:  boolean;
  projectsError:    string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ═══════════════════════════════════════════════════════════════════════════ */
export function AuthProvider({ children }: { children: React.ReactNode }) {
/* ═══════════════════════════════════════════════════════════════════════════ */
  const [user,         setUser]        = useState<User | null>(null);
  const [token,        setToken]       = useState<string | null>(null);
  const [isAuthReady,  setIsAuthReady] = useState(false);
  const [projects,     setProjects]    = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError,   setProjectsError]   = useState<string | null>(null);

  // logout fonksiyonunu useRef ile sabit tut → React render/bağımlılık döngüsü yok
  const logoutRef = useRef<() => void>(() => {});
  logoutRef.current = () => {
    clearTokens();
    setUser(null);
    setToken(null);
    setProjects([]);
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const storedToken    = localStorage.getItem(TOKEN_KEY);
      const storedUserJson = localStorage.getItem(USER_KEY);

      if (!storedToken) {
        setIsAuthReady(true);
        return;
      }

      // Kullanıcı profilini önce cache'den dene
      if (storedUserJson) {
        try {
          setUser(JSON.parse(storedUserJson));
        } catch { localStorage.removeItem(USER_KEY); }
      } else {
        try {
          const meRes = await api.get<User>("/auth/me");
          if (!cancelled) {
            setUser(meRes.data);
            localStorage.setItem(USER_KEY, JSON.stringify(meRes.data));
          }
        } catch {
          // Token geçersiz veya süresi dolmuş
          logoutRef.current();
          if (!cancelled) setIsAuthReady(true);
          return;
        }
      }

      // Cookie'ye de yaz → Middleware /dashboard kontrolü için
      persistToken(storedToken, localStorage.getItem(REFRESH_KEY) ?? "");
      if (!cancelled) {
        setToken(storedToken);
        setIsAuthReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, rawPassword: string) => {
    // OAuth2PasswordRequestForm expects x-www-form-urlencoded
    const formData   = new URLSearchParams({ username: email, password: rawPassword });
    const { data }   = await api.post<Token>("/auth/login", formData.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const { access_token, refresh_token } = data;

    persistToken(access_token, refresh_token);

    let fetchedUser: User | null = null;
    try {
      const meRes = await api.get<User>("/auth/me");
      fetchedUser = meRes.data;
      localStorage.setItem(USER_KEY, JSON.stringify(fetchedUser));
    } catch { /* token henüz decode edilemiyor olabilir, sonraki init'te doldurulacak */ }

    setUser(fetchedUser);
    setToken(access_token);
  }, []);

  // ── Projeleri çek ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    setProjectsLoading(true);
    setProjectsError(null);

    api
      .get<Project[]>("/projects")
      .then((res) => {
        if (!cancelled) {
          setProjects(res.data.map(normalizeProject));
          setProjectsLoading(false);
        }
      })
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          logoutRef.current();
          return;
        }
        if (!cancelled) {
          setProjectsError((err as Error).message);
          setProjectsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [token]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => { logoutRef.current(); }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider
      value={{
        user, token, isAuthReady, isAuthenticated: !!token,
        login, logout,
        projects, projectsLoading, projectsError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useAuth()
 * Sadece AuthProvider ile sarmalanmış ağaçta kullanılabilir.
 * Hata fırlatır eğer sarmalama unutulursa.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth(), AuthProvider sarmalama içinde kullanılmalıdır.");
  return ctx;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getTokenPayloadFromStorage } from "@/lib/auth";
import { type UserRole, ROLE_PERMISSIONS } from "@/lib/permissions";

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** TODO: Backend auth bağlanınca mock login kaldırılacak. */
  loginAs: (role: UserRole) => void;
  /** Panel geçişi için: sadece localStorage yazar, React state güncellemez (RoleGuard yarışı önler). */
  switchAccount: (role: UserRole) => void;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  /** Gerçek güvenlik backend permission kontrolü ile sağlanacak. */
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const AUTH_STORE_KEY = "auth_store";

// Mock users for development — TODO: Backend auth bağlanınca kaldırılacak.
const MOCK_USERS: Record<UserRole, AuthUser> = {
  ADMIN: {
    id: "admin-1",
    first_name: "Admin",
    last_name: "Kullanıcı",
    email: "admin@golabs.com",
    role: "ADMIN",
    permissions: [...ROLE_PERMISSIONS.ADMIN],
  },
  MANAGER: {
    id: "manager-1",
    first_name: "Bilal",
    last_name: "Yönetici",
    email: "yonetici@golabs.com",
    role: "MANAGER",
    permissions: [...ROLE_PERMISSIONS.MANAGER],
  },
  USER: {
    id: "user-1",
    first_name: "Buğra",
    last_name: "Türkoğlu",
    email: "user@golabs.com",
    role: "USER",
    permissions: [...ROLE_PERMISSIONS.USER],
  },
};

function mapJwtToRole(roles: string[]): UserRole {
  if (roles.includes("admin")) return "ADMIN";
  if (roles.includes("manager")) return "MANAGER";
  return "USER";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Gerçek auth sistemi geldiğinde HttpOnly cookie/session yapısına geçilecek.
  useEffect(() => {
    try {
      // 1. Check mock auth store (DEV mode)
      const raw = localStorage.getItem(AUTH_STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { user: AuthUser };
        if (parsed?.user?.role) {
          setUser(parsed.user);
          setIsLoading(false);
          return;
        }
      }
      // 2. Fall back to real JWT
      const payload = getTokenPayloadFromStorage();
      if (payload) {
        const roles: string[] = payload.roles ?? [];
        const role = mapJwtToRole(roles);
        setUser({
          id: payload.sub ?? "",
          first_name: "Kullanıcı",
          last_name: "",
          email: "",
          role,
          permissions: [...ROLE_PERMISSIONS[role]],
        });
      }
    } catch {
      // ignore parse errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // TODO: Backend auth bağlanınca mock login kaldırılacak.
  const loginAs = (role: UserRole) => {
    const mockUser = MOCK_USERS[role];
    setUser(mockUser);
    localStorage.setItem(
      AUTH_STORE_KEY,
      JSON.stringify({ user: mockUser, source: "mock" })
    );
    localStorage.removeItem("token");
  };

  const switchAccount = (role: UserRole) => {
    const mockUser = MOCK_USERS[role];
    localStorage.setItem(AUTH_STORE_KEY, JSON.stringify({ user: mockUser, source: "mock" }));
    localStorage.removeItem("token");
    // setUser intentionally omitted — prevents current panel's RoleGuard from firing /403
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORE_KEY);
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    return Array.isArray(role) ? role.includes(user.role) : user.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    // Gerçek güvenlik backend permission kontrolü ile sağlanacak.
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginAs,
        switchAccount,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

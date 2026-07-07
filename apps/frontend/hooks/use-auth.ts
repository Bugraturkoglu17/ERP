import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { token, user, isAuthenticated, login, logout, updateUser } = useAuthStore();

  const isPlatformAdmin = (): boolean => {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length < 2) return false;
    try {
      const segment = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
      const decoded = JSON.parse(window.atob(padded));
      return decoded.roles?.includes("platform_admin") ?? false;
    } catch {
      return false;
    }
  };

  const getRole = (): string | null => {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    try {
      const segment = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
      const decoded = JSON.parse(window.atob(padded));
      return decoded.roles?.[0] ?? null;
    } catch {
      return null;
    }
  };

  return {
    token,
    user,
    isAuthenticated,
    isPlatformAdmin: isPlatformAdmin(),
    role: getRole(),
    login,
    logout,
    updateUser,
  };
}

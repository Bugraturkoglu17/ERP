const AUTH_TOKEN_KEY = "token";
const USER_KEY = "user";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function hasAuthToken(): boolean {
  return Boolean(getAuthToken());
}

export function getUser(): any | null {
  if (typeof window === "undefined") return null;
  const userStr = window.localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setUser(user: any): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

// Simple internal JWT parser to avoid circular dependency with auth.ts
function parseJwtInternal(token: string | null | undefined): any {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const segment = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (segment.length % 4)) % 4;
    const padded = segment + "=".repeat(padLength);
    if (typeof window === "undefined") return null;
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getCurrentRole(): string | null {
  const token = getAuthToken();
  const payload = parseJwtInternal(token);
  if (payload && payload.roles && Array.isArray(payload.roles) && payload.roles.length > 0) {
    return payload.roles[0];
  }
  return null;
}

export function isAuthenticated(): boolean {
  return hasAuthToken();
}

export function isPlatformAdmin(): boolean {
  const token = getAuthToken();
  const payload = parseJwtInternal(token);
  if (payload && payload.roles && Array.isArray(payload.roles)) {
    return payload.roles.includes("platform_admin");
  }
  return false;
}

export function softRedirect(router: any, url: string): void {
  if (typeof window === "undefined") return;
  if (router && typeof router.push === "function") {
    router.push(url);
  } else {
    window.location.href = url;
  }
}

export function hardRedirect(url: string): void {
  if (typeof window === "undefined") return;
  window.location.href = url;
}

export function logout(router?: any): void {
  clearSession();
  if (router) {
    softRedirect(router, "/login");
  } else {
    hardRedirect("/login");
  }
}

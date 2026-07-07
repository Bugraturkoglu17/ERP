import { create } from "zustand";
import { getAuthToken, getUser, setUser as setLocalUser, setAuthToken as setLocalToken, clearSession } from "@/lib/session";

interface AuthState {
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
  updateUser: (user: any) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getAuthToken(),
  user: getUser(),
  isAuthenticated: !!getAuthToken(),
  login: (token, user) => {
    setLocalToken(token);
    setLocalUser(user);
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    clearSession();
    set({ token: null, user: null, isAuthenticated: false });
  },
  updateUser: (user) => {
    setLocalUser(user);
    set({ user });
  },
}));

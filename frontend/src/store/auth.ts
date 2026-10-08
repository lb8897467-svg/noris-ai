import { create } from "zustand";
import type { User } from "../types";
import { api } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  theme: "light" | "dark" | "system";
  init: () => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  theme: (localStorage.getItem("noris_theme") as any) || "system",

  init: async () => {
    const token = localStorage.getItem("noris_token");
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const { user } = await api.auth.me();
      set({ user, initialized: true });
      connectSocket(token);
      get().setTheme(get().theme);
    } catch {
      localStorage.removeItem("noris_token");
      localStorage.removeItem("noris_session");
      set({ initialized: true });
    }
  },

  setUser: (user) => {
    set({ user });
    const token = localStorage.getItem("noris_token");
    if (token) connectSocket(token);
  },

  logout: async () => {
    const session = localStorage.getItem("noris_session");
    try {
      await api.auth.logout({ sessionToken: session });
    } catch {}
    localStorage.removeItem("noris_token");
    localStorage.removeItem("noris_session");
    disconnectSocket();
    set({ user: null });
  },

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("noris_theme", theme);
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", isDark);
    };
    apply();
    if (theme === "system") {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply);
    }
  },
}));

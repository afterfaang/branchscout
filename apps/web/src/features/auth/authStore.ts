// Auth store — Zustand. Token + user bilgisi state'te tutulur.
// Persistence MVP'de localStorage; Sprint 14'te httpOnly cookie'ye geçeceğiz.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "ADMIN" | "REGION_MANAGER" | "BRANCH_MANAGER" | "ANALYST";

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  branchId: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (params: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => Boolean(get().accessToken && get().user),
    }),
    {
      name: "branchscout.auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);

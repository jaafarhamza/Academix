"use client";

import { useAppStore } from "@/providers/app-store-provider";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "@/stores";

export function useAppAuth() {
  const user = useAppStore(selectCurrentUser);
  const isAuthenticated = useAppStore(selectIsAuthenticated);
  const setUser = useAppStore((state) => state.setUser);
  const clearUser = useAppStore((state) => state.clearUser);

  return {
    user,
    isAuthenticated,
    setUser,
    clearUser,
  };
}

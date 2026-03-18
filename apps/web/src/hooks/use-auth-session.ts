"use client";

import { useState, useTransition } from "react";

import {
  getErrorMessage,
  loginWithPassword,
  logoutSession,
  type LoginCredentials,
} from "@/lib/auth/auth-client";
import { useAppAuth } from "./use-app-auth";

export function useAuthSession() {
  const { setUser, clearUser } = useAppAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function login(credentials: LoginCredentials) {
    setErrorMessage(null);

    try {
      const result = await loginWithPassword(credentials);

      startTransition(() => {
        setUser(result.user);
      });

      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(message);
      throw error;
    }
  }

  async function logout() {
    setErrorMessage(null);

    try {
      await logoutSession();
    } finally {
      startTransition(() => {
        clearUser();
      });
    }
  }

  return {
    login,
    logout,
    isPending,
    errorMessage,
    clearErrorMessage: () => setErrorMessage(null),
  };
}

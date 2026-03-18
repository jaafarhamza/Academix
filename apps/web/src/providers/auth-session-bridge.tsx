"use client";

import { useEffect } from "react";

import { setUnauthorizedHandler } from "@/lib/http";
import { useAppStore } from "@/providers/app-store-provider";
import type { AppChildren } from "@/types";

export function AuthSessionBridge({ children }: AppChildren) {
  const clearUser = useAppStore((state) => state.clearUser);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearUser();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearUser]);

  return children;
}

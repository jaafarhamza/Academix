"use client";

import { AppStoreProvider } from "@/providers/app-store-provider";
import { AuthSessionBridge } from "@/providers/auth-session-bridge";
import type { AppChildren } from "@/types";

export function AppProviders({ children }: AppChildren) {
  return (
    <AppStoreProvider>
      <AuthSessionBridge>{children}</AuthSessionBridge>
    </AppStoreProvider>
  );
}

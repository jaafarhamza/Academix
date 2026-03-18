"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { AppStoreProvider } from "@/providers/app-store-provider";
import { AuthSessionBridge } from "@/providers/auth-session-bridge";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppChildren } from "@/types";

export function AppProviders({ children }: AppChildren) {
  return (
    <AppStoreProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={120}>
          <AuthSessionBridge>{children}</AuthSessionBridge>
        </TooltipProvider>
      </ThemeProvider>
    </AppStoreProvider>
  );
}

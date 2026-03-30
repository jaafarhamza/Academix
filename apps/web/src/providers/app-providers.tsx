"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { AppStoreProvider } from "@/providers/app-store-provider";
import { AppToastProvider } from "@/providers/toast-provider";
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
        <AppToastProvider>
          <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
        </AppToastProvider>
      </ThemeProvider>
    </AppStoreProvider>
  );
}

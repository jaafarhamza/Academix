"use client";

import { usePathname } from "next/navigation";

import { AppSidebar, getShellPageLabel } from "@/components/layout/app-sidebar";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { useAppShell } from "@/hooks";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { AppChildren } from "@/types";

export function AppShell({ children }: AppChildren) {
  const pathname = usePathname();
  const { isSidebarOpen, setSidebarOpen } = useAppShell();
  const currentPageLabel = getShellPageLabel(pathname);

  return (
    <SidebarProvider
      open={isSidebarOpen}
      onOpenChange={setSidebarOpen}
      className="min-h-screen bg-linear-to-b from-muted/35 to-background"
    >
      <AppSidebar />
      <SidebarInset className="border-l border-l-transparent">
        <header className="sticky top-0 z-10 border-b bg-background/78 backdrop-blur-lg">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="rounded-lg border bg-card" />
              <div>
                <p className="text-sm font-semibold tracking-tight sm:text-base">
                  {currentPageLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

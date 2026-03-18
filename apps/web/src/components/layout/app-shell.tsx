"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Sparkles } from "lucide-react";

import { AppSidebar, getShellPageLabel } from "@/components/layout/app-sidebar";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { useAppShell } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--muted)/0.3)_0%,transparent_28rem)]"
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
                <p className="text-xs text-muted-foreground">
                  Academic Center Operations
                </p>
              </div>
            </div>

            <div className="hidden w-full max-w-md items-center gap-2 md:flex">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search students, sessions, payments"
                />
              </div>
              <ModeToggle />
              <Button
                size="icon"
                variant="outline"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <ModeToggle />
              <Button
                size="icon"
                variant="outline"
                aria-label="Quick actions"
              >
                <Sparkles className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

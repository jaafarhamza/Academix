"use client";

import { useAppStore } from "@/providers/app-store-provider";
import { selectIsSidebarOpen } from "@/stores";

export function useAppShell() {
  const isSidebarOpen = useAppStore(selectIsSidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return {
    isSidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  };
}

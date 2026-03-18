"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  LayoutDashboard,
  Users,
} from "lucide-react";

import { AppLogo } from "@/components/shared/app-logo";
import { useAppAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
};

export const shellNavItems: ShellNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    hint: "Overview and KPI cards",
  },
  {
    href: "/students",
    label: "Students",
    icon: Users,
    hint: "Student management",
  },
  {
    href: "/sessions",
    label: "Sessions",
    icon: CalendarClock,
    hint: "Scheduling and timetable",
  },
];

export function getShellPageLabel(pathname: string) {
  return (
    shellNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? "Workspace"
  );
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAppAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="border-r-0"
    >
      <SidebarHeader className="p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Academix Workspace"
            >
              <Link href="/dashboard">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <BookOpenText className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-bold">
                    <AppLogo />
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Admin Workspace
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {shellNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCurrentPath(pathname, item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.hint}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2 pb-2">
              <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sidebar-foreground/70">
                    Monthly Revenue
                  </span>
                  <CircleDollarSign className="size-4 text-sidebar-foreground/70" />
                </div>
                <p className="mt-2 text-lg font-semibold">$0</p>
              </div>
              <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-sidebar-foreground/70">
                    Pending Tasks
                  </span>
                  <BriefcaseBusiness className="size-4 text-sidebar-foreground/70" />
                </div>
                <p className="mt-2 text-lg font-semibold">0</p>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/50 p-3">
          <p className="text-xs text-sidebar-foreground/70">Signed in as</p>
          <p className="mt-1 truncate text-sm font-semibold">
            {user?.fullName ?? user?.email ?? "Guest"}
          </p>
          <p
            className={cn(
              "mt-1 text-xs",
              user?.role ? "text-sidebar-foreground/80" : "text-sidebar-foreground/60",
            )}
          >
            {user?.role ?? "No active role"}
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

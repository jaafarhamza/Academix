"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  Users,
} from "lucide-react";

import { AppLogo } from "@/components/shared/app-logo";
import { useAppAuth } from "@/hooks";
import { cn } from "@/lib/utils";
import { CenterProfileSidebarAction } from "@/modules/center/components/center-profile-sidebar-action";
import { SuperAdminProfileSidebarAction } from "@/modules/super-admin/components/super-admin-profile-sidebar-action";
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
  roles: Array<"SUPER_ADMIN" | "ADMIN">;
};

export const shellNavItems: ShellNavItem[] = [
  {
    href: "/super-admin",
    label: "SuperAdmin",
    icon: LayoutDashboard,
    hint: "Super admin welcome page",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/center",
    label: "CenterAdmin",
    icon: LayoutDashboard,
    hint: "Center admin welcome page",
    roles: ["ADMIN"],
  },
  {
    href: "/center/teachers",
    label: "Teachers",
    icon: Users,
    hint: "Teachers list with search and filters",
    roles: ["ADMIN"],
  },
  {
    href: "/center/secretaries",
    label: "Secretaries",
    icon: Users,
    hint: "Secretaries list with search and filters",
    roles: ["ADMIN"],
  },
  {
    href: "/center/students",
    label: "Students",
    icon: GraduationCap,
    hint: "Students list with search and level filter",
    roles: ["ADMIN"],
  },
  {
    href: "/center/subjects",
    label: "Subjects",
    icon: ScrollText,
    hint: "Subjects list with create and edit actions",
    roles: ["ADMIN"],
  },
];

export function getShellPageLabel(pathname: string) {
  if (pathname === "/super-admin") {
    return "SuperAdmin Dashboard";
  }

  if (pathname === "/center") {
    return "CenterAdmin Dashboard";
  }

  const matchedNavItem = shellNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (matchedNavItem) {
    return matchedNavItem.label;
  }

  if (pathname.startsWith("/super-admin/")) {
    return "SuperAdmin Dashboard";
  }

  if (pathname.startsWith("/center/")) {
    return "CenterAdmin Dashboard";
  }

  return "Workspace";
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAppAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const currentRole = user?.role;

  const visibleItems = shellNavItems.filter((item) => {
    if (currentRole === "SUPER_ADMIN") {
      return item.roles.includes("SUPER_ADMIN");
    }

    if (currentRole === "ADMIN") {
      return item.roles.includes("ADMIN");
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  const homePath = pathname.startsWith("/super-admin") ? "/super-admin" : "/center";

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
              <Link href={homePath}>
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
              {visibleItems.map((item) => {
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

        {currentRole === "SUPER_ADMIN" ? <SuperAdminProfileSidebarAction /> : null}
        {currentRole === "ADMIN" ? <CenterProfileSidebarAction /> : null}
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

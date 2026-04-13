"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BadgePercent,
  BookOpenText,
  Building2,
  CalendarDays,
  Link2,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  ScrollText,
  Users,
  WalletCards,
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
  {
    href: "/center/teacher-subjects",
    label: "Teacher Subjects",
    icon: Link2,
    hint: "Assign and manage subjects per teacher",
    roles: ["ADMIN"],
  },
  {
    href: "/center/student-groups",
    label: "Student Groups",
    icon: Layers3,
    hint: "Student groups list with level filters",
    roles: ["ADMIN"],
  },
  {
    href: "/center/sessions",
    label: "Sessions",
    icon: CalendarDays,
    hint: "Weekly calendar view for center sessions",
    roles: ["ADMIN"],
  },
  {
    href: "/center/costs",
    label: "Costs",
    icon: BadgePercent,
    hint: "Manage global and per-teacher deduction rules",
    roles: ["ADMIN"],
  },
  {
    href: "/center/payments",
    label: "Payments",
    icon: WalletCards,
    hint: "Record and review student payments",
    roles: ["ADMIN"],
  },
  {
    href: "/center/financial",
    label: "Financial",
    icon: BarChart3,
    hint: "Collected versus expected cash dashboard",
    roles: ["ADMIN"],
  },
  {
    href: "/center/rooms",
    label: "Rooms",
    icon: Building2,
    hint: "Rooms list grouped by floor and availability",
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
  const inferredRole =
    currentRole ??
    (pathname.startsWith("/super-admin")
      ? "SUPER_ADMIN"
      : pathname.startsWith("/center")
        ? "ADMIN"
        : null);
  const displayName =
    user?.fullName ??
    user?.email ??
    (inferredRole === "ADMIN"
      ? "Center Admin"
      : inferredRole === "SUPER_ADMIN"
        ? "Super Admin"
        : "Guest");
  const displayRole = user?.role ?? inferredRole;

  const visibleItems = shellNavItems.filter((item) => {
    if (inferredRole === "SUPER_ADMIN") {
      return item.roles.includes("SUPER_ADMIN");
    }

    if (inferredRole === "ADMIN") {
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

        {inferredRole === "SUPER_ADMIN" ? <SuperAdminProfileSidebarAction /> : null}
        {inferredRole === "ADMIN" ? <CenterProfileSidebarAction /> : null}
      </SidebarContent>

      <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/50 p-3">
          <p className="text-xs text-sidebar-foreground/70">Signed in as</p>
          <p className="mt-1 truncate text-sm font-semibold">
            {displayName}
          </p>
          <p
            className={cn(
              "mt-1 text-xs",
              displayRole ? "text-sidebar-foreground/80" : "text-sidebar-foreground/60",
            )}
          >
            {displayRole ?? "No active role"}
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SuperAdminDashboard } from "@/modules/super-admin/components/super-admin-dashboard";
import { superAdminSessionCookieName } from "@/modules/super-admin/server/super-admin-session-cookie";

export default async function SuperAdminPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(superAdminSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/super-admin/login");
  }

  return <SuperAdminDashboard />;
}

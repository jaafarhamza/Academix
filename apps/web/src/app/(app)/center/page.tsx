import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CenterDashboard } from "@/modules/center/components/center-dashboard";
import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";

export default async function CenterPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <CenterDashboard />;
}

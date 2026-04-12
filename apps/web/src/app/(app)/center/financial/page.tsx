import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { FinancialDashboardPage } from "@/modules/dashboard/components/financial-dashboard-page";
import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";

export default async function CenterFinancialPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <FinancialDashboardPage />;
}

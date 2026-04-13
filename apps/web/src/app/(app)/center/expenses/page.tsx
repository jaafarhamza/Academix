import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { CenterExpenseListPage } from "@/modules/center-expense/components/center-expense-list-page";

export default async function CenterExpensesPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <CenterExpenseListPage />;
}

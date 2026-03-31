import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { StudentGroupListPage } from "@/modules/student-group/components/student-group-list-page";

export default async function CenterStudentGroupsPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <StudentGroupListPage />;
}

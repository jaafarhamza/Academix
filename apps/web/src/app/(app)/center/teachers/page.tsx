import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TeacherListPage } from "@/modules/teacher/components/teacher-list-page";
import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";

export default async function CenterTeachersPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <TeacherListPage />;
}

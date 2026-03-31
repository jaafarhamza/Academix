import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { TeacherSubjectAssignmentPage } from "@/modules/teacher-subject/components/teacher-subject-assignment-page";

export default async function CenterTeacherSubjectsPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <TeacherSubjectAssignmentPage />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { SubjectListPage } from "@/modules/subject/components/subject-list-page";

export default async function CenterSubjectsPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <SubjectListPage />;
}

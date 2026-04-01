import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { CourseSessionWeeklyCalendarPage } from "@/modules/course-session/components/course-session-weekly-calendar-page";

export default async function CenterSessionsPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <CourseSessionWeeklyCalendarPage />;
}

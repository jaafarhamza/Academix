import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { StudentGroupDetailPage } from "@/modules/student-group/components/student-group-detail-page";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CenterStudentGroupDetailRoute({ params }: PageProps) {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  const { id } = await params;
  const groupId = id.trim();
  if (!groupId) {
    redirect("/center/student-groups");
  }

  return <StudentGroupDetailPage groupId={groupId} />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { TeacherIncomePage } from "@/modules/teacher/components/teacher-income-page";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CenterTeacherIncomePage({
  params,
}: PageProps) {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  const { id } = await params;
  return <TeacherIncomePage teacherId={id} />;
}

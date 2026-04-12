import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";
import { StudentPaymentHistoryPage } from "@/modules/student/components/student-payment-history-page";

type StudentPaymentsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CenterStudentPaymentsPage({
  params,
}: StudentPaymentsPageProps) {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  const { id } = await params;

  return <StudentPaymentHistoryPage studentId={id} />;
}

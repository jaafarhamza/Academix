import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SecretaryListPage } from "@/modules/secretary/components/secretary-list-page";
import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";

export default async function CenterSecretariesPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (!hasSessionCookie) {
    redirect("/center/login");
  }

  return <SecretaryListPage />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CenterRegisterForm } from "@/modules/center/components/center-register-form";
import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";

export default async function CenterRegisterPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (hasSessionCookie) {
    redirect("/center");
  }

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-12rem)] w-full max-w-2xl items-center justify-center px-4 py-10 sm:px-6 lg:py-14">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Register Your Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your center owner account and start onboarding your operations.
        </p>

        <div className="mt-5">
          <CenterRegisterForm />
        </div>
      </div>
    </section>
  );
}

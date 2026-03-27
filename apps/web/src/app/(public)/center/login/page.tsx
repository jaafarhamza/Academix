import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CenterLoginForm } from "@/modules/center/components/center-login-form";
import { centerSessionCookieName } from "@/modules/center/server/center-session-cookie";

export default async function CenterLoginPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(centerSessionCookieName);

  if (hasSessionCookie) {
    redirect("/center");
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 lg:py-14">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Center Sign In</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage your center workspace.
        </p>

        <div className="mt-5">
          <CenterLoginForm />
        </div>
      </div>
    </section>
  );
}

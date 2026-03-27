import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SuperAdminLoginForm } from "@/modules/super-admin/components/super-admin-login-form";
import { superAdminSessionCookieName } from "@/modules/super-admin/server/super-admin-session-cookie";

export default async function SuperAdminLoginPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has(superAdminSessionCookieName);

  if (hasSessionCookie) {
    redirect("/super-admin");
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 lg:py-14">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          Super Admin Sign In
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Login to manage centers and platform-level settings.
        </p>

        <div className="mt-5">
          <SuperAdminLoginForm />
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  ensureSuperAdminSession,
  logoutSuperAdmin,
} from "../client/super-admin-auth-client";

type SessionState = {
  isLoading: boolean;
  errorMessage: string | null;
};

const initialState: SessionState = {
  isLoading: true,
  errorMessage: null,
};

export function SuperAdminDashboard() {
  const router = useRouter();
  const { setUser, clearUser } = useAppAuth();
  const [state, setState] = useState<SessionState>(initialState);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function initializeSession() {
      setState(initialState);

      try {
        const session = await ensureSuperAdminSession();

        if (isCancelled) {
          return;
        }

        setUser({
          id: session.auth.superAdmin.id,
          role: "SUPER_ADMIN",
          fullName: `${session.auth.superAdmin.firstName} ${session.auth.superAdmin.lastName}`,
          email: session.auth.superAdmin.email,
        });

        setState({
          isLoading: false,
          errorMessage: null,
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        clearUser();
        setState({
          isLoading: false,
          errorMessage:
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : "Session expired. Please login again.",
        });

        router.replace("/super-admin/login");
      }
    }

    void initializeSession();

    return () => {
      isCancelled = true;
    };
  }, [clearUser, router, setUser]);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logoutSuperAdmin();
    } finally {
      clearUser();
      router.replace("/super-admin/login");
      setIsLoggingOut(false);
    }
  }

  if (state.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">
          Validating super admin session...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Welcome SuperAdmin</h1>
      </div>

      {state.errorMessage ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {state.errorMessage}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  );
}

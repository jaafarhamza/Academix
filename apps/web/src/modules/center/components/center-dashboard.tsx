"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  ensureCenterSession,
  logoutCenter,
} from "../client/center-auth-client";

type SessionState = {
  isLoading: boolean;
  errorMessage: string | null;
};

const initialState: SessionState = {
  isLoading: true,
  errorMessage: null,
};

export function CenterDashboard() {
  const router = useRouter();
  const { setUser, clearUser } = useAppAuth();
  const [state, setState] = useState<SessionState>(initialState);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function initializeSession() {
      setState(initialState);

      try {
        const session = await ensureCenterSession();

        if (isCancelled) {
          return;
        }

        setUser({
          id: session.auth.center.id,
          centerId: session.auth.center.id,
          role: "ADMIN",
          fullName: session.auth.center.centerName,
          email: session.auth.center.email,
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
              : "Session expired. Please sign in again.",
        });

        router.replace("/center/login");
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
      await logoutCenter();
    } finally {
      clearUser();
      router.replace("/center/login");
      setIsLoggingOut(false);
    }
  }

  if (state.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">
          Validating center session...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Welcome CenterAdmin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authenticated successfully.
        </p>
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

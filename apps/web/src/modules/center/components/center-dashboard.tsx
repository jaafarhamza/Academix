"use client";

import { useEffect, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import { useRouter } from "next/navigation";

import { useAppAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  ensureCenterSession,
  logoutCenter,
} from "../client/center-auth-client";
import type { CenterProfile } from "../types/center-auth.types";

type SessionState = {
  isLoading: boolean;
  errorMessage: string | null;
};

const initialState: SessionState = {
  isLoading: true,
  errorMessage: null,
};

function passthroughImageLoader({ src }: ImageLoaderProps) {
  return src;
}

export function CenterDashboard() {
  const router = useRouter();
  const { setUser, clearUser } = useAppAuth();
  const [state, setState] = useState<SessionState>(initialState);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [centerProfile, setCenterProfile] = useState<CenterProfile | null>(null);
  const [isLogoLoadError, setIsLogoLoadError] = useState(false);

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
          fullName: session.profile?.centerName ?? session.auth.center.centerName,
          email: session.auth.center.email,
        });
        setCenterProfile(session.profile);

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

  useEffect(() => {
    function handleCenterLogoUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ logoUrl: string }>;
      const updatedLogoUrl = customEvent.detail?.logoUrl;

      if (typeof updatedLogoUrl !== "string" || updatedLogoUrl.length === 0) {
        return;
      }

      setCenterProfile((previous) =>
        previous
          ? {
              ...previous,
              logoUrl: updatedLogoUrl,
            }
          : previous,
      );
    }

    window.addEventListener("center-logo-updated", handleCenterLogoUpdated);
    return () => {
      window.removeEventListener("center-logo-updated", handleCenterLogoUpdated);
    };
  }, []);

  useEffect(() => {
    function handleCenterProfileUpdated(event: Event) {
      const customEvent = event as CustomEvent<CenterProfile>;
      const profile = customEvent.detail;

      if (!profile || typeof profile !== "object") {
        return;
      }

      setCenterProfile(profile);
      setUser({
        id: profile.id,
        centerId: profile.id,
        role: "ADMIN",
        fullName: profile.centerName,
        email: profile.email,
      });
    }

    window.addEventListener("center-profile-updated", handleCenterProfileUpdated);
    return () => {
      window.removeEventListener(
        "center-profile-updated",
        handleCenterProfileUpdated,
      );
    };
  }, [setUser]);

  useEffect(() => {
    setIsLogoLoadError(false);
  }, [centerProfile?.logoUrl]);

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

  const centerInitial = (centerProfile?.centerName || "Center")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {centerProfile?.logoUrl && !isLogoLoadError ? (
            <Image
              src={centerProfile.logoUrl}
              loader={passthroughImageLoader}
              unoptimized
              width={44}
              height={44}
              alt={`${centerProfile.centerName} logo`}
              className="size-11 rounded-full border object-cover"
              onError={() => {
                setIsLogoLoadError(true);
              }}
            />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
              {centerInitial}
            </div>
          )}

          <div>
            <h1 className="text-xl font-semibold tracking-tight">Welcome CenterAdmin</h1>
            {centerProfile?.centerName ? (
              <p className="text-sm text-muted-foreground">{centerProfile.centerName}</p>
            ) : null}
          </div>
        </div>
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

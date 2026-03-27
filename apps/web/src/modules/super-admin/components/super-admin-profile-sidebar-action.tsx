"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CircleUserRound,
  Loader2,
  ShieldX,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  getCurrentSuperAdminAccessToken,
  getSuperAdminProfile,
  refreshSuperAdminSession,
} from "@/modules/super-admin/client/super-admin-auth-client";
import type { SuperAdminProfile } from "@/modules/super-admin/types/super-admin-auth.types";

type ProfileState = {
  isLoading: boolean;
  profile: SuperAdminProfile | null;
  errorMessage: string | null;
};

const initialProfileState: ProfileState = {
  isLoading: false,
  profile: null,
  errorMessage: null,
};

function formatCreatedAt(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to load super admin profile right now.";
}

export function SuperAdminProfileSidebarAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ProfileState>(initialProfileState);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadProfile() {
      setState((previous) => ({
        ...previous,
        isLoading: true,
        errorMessage: null,
      }));

      try {
        let accessToken = getCurrentSuperAdminAccessToken();

        if (!accessToken) {
          const refreshedSession = await refreshSuperAdminSession();
          accessToken = refreshedSession.accessToken;
        }

        const profile = await getSuperAdminProfile(accessToken);
        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          profile,
          errorMessage: null,
        });
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setState({
          isLoading: false,
          profile: null,
          errorMessage: extractErrorMessage(error),
        });
      }
    }

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, reloadCounter]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Account</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Dialog
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <DialogTrigger asChild>
                <SidebarMenuButton tooltip="Super admin profile">
                  <CircleUserRound />
                  <span>My Profile</span>
                </SidebarMenuButton>
              </DialogTrigger>

              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Super Admin Profile</DialogTitle>
                  <DialogDescription>
                    This information is loaded from the secured backend profile
                    endpoint.
                  </DialogDescription>
                </DialogHeader>

                {state.isLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading profile...
                  </div>
                ) : null}

                {!state.isLoading && state.errorMessage ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <div className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      <p>{state.errorMessage}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setReloadCounter((previous) => previous + 1);
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}

                {!state.isLoading && state.profile ? (
                  <div className="space-y-3 rounded-lg border bg-card/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">
                          {state.profile.firstName} {state.profile.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {state.profile.email}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium">
                        {state.profile.isActive ? (
                          <>
                            <BadgeCheck className="size-3.5 text-emerald-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <ShieldX className="size-3.5 text-destructive" />
                            Inactive
                          </>
                        )}
                      </span>
                    </div>

                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md border bg-background/60 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Phone</dt>
                        <dd className="font-medium">{state.profile.phone}</dd>
                      </div>
                      <div className="rounded-md border bg-background/60 px-3 py-2 sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">
                          Created at
                        </dt>
                        <dd className="font-medium">
                          {formatCreatedAt(state.profile.createdAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}

                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                    >
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

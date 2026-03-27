"use client";

import { useEffect, useState } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import {
  BadgeCheck,
  CircleUserRound,
  Loader2,
  ShieldX,
  TriangleAlert,
  Upload,
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
  getCenterProfile,
  getCurrentCenterAccessToken,
  refreshCenterSession,
  uploadCenterLogo,
} from "@/modules/center/client/center-auth-client";
import type { CenterProfile } from "@/modules/center/types/center-auth.types";

type ProfileState = {
  isLoading: boolean;
  profile: CenterProfile | null;
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

  return "Unable to load center profile right now.";
}

function getCenterInitial(profile: CenterProfile | null) {
  const source = profile?.centerName?.trim() || "Center";
  return source.slice(0, 1).toUpperCase();
}

function passthroughImageLoader({ src }: ImageLoaderProps) {
  return src;
}

export function CenterProfileSidebarAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ProfileState>(initialProfileState);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isLogoLoadError, setIsLogoLoadError] = useState(false);

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
        let accessToken = getCurrentCenterAccessToken();

        if (!accessToken) {
          const refreshedSession = await refreshCenterSession();
          accessToken = refreshedSession.accessToken;
        }

        const profile = await getCenterProfile(accessToken);
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

  useEffect(() => {
    setIsLogoLoadError(false);
  }, [state.profile?.logoUrl]);

  async function handleLogoUpload() {
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const payload = await uploadCenterLogo(selectedFile);
      setState((previous) => ({
        ...previous,
        profile: previous.profile
          ? {
              ...previous.profile,
              logoUrl: payload.logoUrl,
            }
          : previous.profile,
      }));
      setUploadMessage("Center logo updated successfully.");
      setSelectedFile(null);
      window.dispatchEvent(
        new CustomEvent("center-logo-updated", {
          detail: { logoUrl: payload.logoUrl },
        }),
      );
    } catch (error: unknown) {
      setUploadMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to update center logo right now.",
      );
    } finally {
      setIsUploading(false);
    }
  }

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
                <SidebarMenuButton tooltip="Center profile">
                  <CircleUserRound />
                  <span>Center Profile</span>
                </SidebarMenuButton>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Center Admin Profile</DialogTitle>
                  <DialogDescription>
                    View your center information and update your center logo.
                  </DialogDescription>
                </DialogHeader>

                {state.isLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading center profile...
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
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-card/70 p-4">
                      <div className="flex flex-wrap items-center gap-4">
                        {state.profile.logoUrl && !isLogoLoadError ? (
                          <Image
                            src={state.profile.logoUrl}
                            loader={passthroughImageLoader}
                            unoptimized
                            width={56}
                            height={56}
                            alt={`${state.profile.centerName} logo`}
                            className="size-14 rounded-full border object-cover"
                            onError={() => {
                              setIsLogoLoadError(true);
                            }}
                          />
                        ) : (
                          <div className="flex size-14 items-center justify-center rounded-full border bg-muted text-base font-semibold">
                            {getCenterInitial(state.profile)}
                          </div>
                        )}

                        <div className="min-w-48 flex-1">
                          <p className="text-base font-semibold">
                            {state.profile.centerName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {state.profile.firstName} {state.profile.lastName} -{" "}
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

                      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <div className="rounded-md border bg-background/60 px-3 py-2">
                          <dt className="text-xs text-muted-foreground">Phone</dt>
                          <dd className="font-medium">{state.profile.phone}</dd>
                        </div>
                        <div className="rounded-md border bg-background/60 px-3 py-2">
                          <dt className="text-xs text-muted-foreground">Subdomain</dt>
                          <dd className="font-medium">{state.profile.subdomain}</dd>
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

                    <div className="rounded-lg border bg-background/40 p-4">
                      <p className="text-sm font-medium">Update center logo</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Upload JPEG, PNG, WEBP, or SVG up to 5MB.
                      </p>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                          <Upload className="size-4" />
                          <span>{selectedFile ? selectedFile.name : "Choose image"}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0] ?? null;
                              setSelectedFile(file);
                              setUploadMessage(null);
                            }}
                          />
                        </label>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            void handleLogoUpload();
                          }}
                          disabled={!selectedFile || isUploading}
                        >
                          {isUploading ? "Uploading..." : "Save logo"}
                        </Button>
                      </div>

                      {uploadMessage ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {uploadMessage}
                        </p>
                      ) : null}
                    </div>
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

"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
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
  updateCenterPassword,
  updateCenterProfile,
  uploadCenterLogo,
} from "@/modules/center/client/center-auth-client";
import type { CenterProfile } from "@/modules/center/types/center-auth.types";

type ProfileState = {
  isLoading: boolean;
  profile: CenterProfile | null;
  errorMessage: string | null;
};

type ProfileFormState = {
  firstName: string;
  lastName: string;
  centerName: string;
  email: string;
  phone: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialProfileState: ProfileState = {
  isLoading: false,
  profile: null,
  errorMessage: null,
};

const initialProfileFormState: ProfileFormState = {
  firstName: "",
  lastName: "",
  centerName: "",
  email: "",
  phone: "",
};

const initialPasswordFormState: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
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

function toProfileForm(profile: CenterProfile | null): ProfileFormState {
  if (!profile) {
    return initialProfileFormState;
  }

  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    centerName: profile.centerName,
    email: profile.email,
    phone: profile.phone,
  };
}

function buildProfileUpdatePayload(form: ProfileFormState) {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    centerName: form.centerName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
  };
}

export function CenterProfileSidebarAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ProfileState>(initialProfileState);
  const [reloadCounter, setReloadCounter] = useState(0);

  const [profileForm, setProfileForm] =
    useState<ProfileFormState>(initialProfileFormState);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] =
    useState<PasswordFormState>(initialPasswordFormState);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

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
        setProfileForm(toProfileForm(profile));
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

  const hasProfileChanges = useMemo(() => {
    if (!state.profile) {
      return false;
    }

    const normalizedPayload = buildProfileUpdatePayload(profileForm);
    return (
      normalizedPayload.firstName !== state.profile.firstName ||
      normalizedPayload.lastName !== state.profile.lastName ||
      normalizedPayload.centerName !== state.profile.centerName ||
      normalizedPayload.email !== state.profile.email ||
      normalizedPayload.phone !== state.profile.phone
    );
  }, [profileForm, state.profile]);

  async function handleLogoUpload() {
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const payload = await uploadCenterLogo(selectedFile);
      const currentProfile = state.profile;
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

      if (currentProfile) {
        window.dispatchEvent(
          new CustomEvent("center-profile-updated", {
            detail: {
              ...currentProfile,
              logoUrl: payload.logoUrl,
            },
          }),
        );
      }
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

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.profile || isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const updatedProfile = await updateCenterProfile(
        buildProfileUpdatePayload(profileForm),
      );

      setState((previous) => ({
        ...previous,
        profile: updatedProfile,
      }));
      setProfileForm(toProfileForm(updatedProfile));
      setProfileMessage("Profile updated successfully.");

      window.dispatchEvent(
        new CustomEvent("center-profile-updated", {
          detail: updatedProfile,
        }),
      );
    } catch (error: unknown) {
      setProfileMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to update profile right now.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingPassword) {
      return;
    }

    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("Confirm password must match new password.");
      return;
    }

    setIsSavingPassword(true);

    try {
      await updateCenterPassword(passwordForm);
      setPasswordForm(initialPasswordFormState);
      setPasswordMessage("Password updated successfully.");
    } catch (error: unknown) {
      setPasswordMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to update password right now.",
      );
    } finally {
      setIsSavingPassword(false);
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
              onOpenChange={(nextOpen) => {
                setIsOpen(nextOpen);
                if (!nextOpen) {
                  setPasswordForm(initialPasswordFormState);
                  setPasswordMessage(null);
                  setProfileMessage(null);
                  setUploadMessage(null);
                  setSelectedFile(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <SidebarMenuButton tooltip="Center profile">
                  <CircleUserRound />
                  <span>Center Profile</span>
                </SidebarMenuButton>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Center Admin Profile</DialogTitle>
                  <DialogDescription>
                    Manage your center information, logo, and account password.
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
                          <p className="text-base font-semibold">{state.profile.centerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {state.profile.firstName} {state.profile.lastName} - {" "}
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
                          <dt className="text-xs text-muted-foreground">Created at</dt>
                          <dd className="font-medium">
                            {formatCreatedAt(state.profile.createdAt)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <form
                      className="rounded-lg border bg-background/40 p-4"
                      onSubmit={(event) => {
                        void handleProfileSubmit(event);
                      }}
                    >
                      <p className="text-sm font-medium">Update profile details</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Keep center contact information current for your workspace.
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="center-first-name"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            First name
                          </label>
                          <Input
                            id="center-first-name"
                            value={profileForm.firstName}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setProfileForm((previous) => ({
                                ...previous,
                                firstName: value,
                              }));
                              setProfileMessage(null);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="center-last-name"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Last name
                          </label>
                          <Input
                            id="center-last-name"
                            value={profileForm.lastName}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setProfileForm((previous) => ({
                                ...previous,
                                lastName: value,
                              }));
                              setProfileMessage(null);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label
                            htmlFor="center-name"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Center name
                          </label>
                          <Input
                            id="center-name"
                            value={profileForm.centerName}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setProfileForm((previous) => ({
                                ...previous,
                                centerName: value,
                              }));
                              setProfileMessage(null);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label
                            htmlFor="center-email"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Email
                          </label>
                          <Input
                            id="center-email"
                            type="email"
                            value={profileForm.email}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setProfileForm((previous) => ({
                                ...previous,
                                email: value,
                              }));
                              setProfileMessage(null);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <label
                            htmlFor="center-phone"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Phone
                          </label>
                          <Input
                            id="center-phone"
                            type="tel"
                            value={profileForm.phone}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setProfileForm((previous) => ({
                                ...previous,
                                phone: value,
                              }));
                              setProfileMessage(null);
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p
                          className="text-xs text-muted-foreground"
                          aria-live="polite"
                        >
                          {profileMessage ?? " "}
                        </p>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!hasProfileChanges || isSavingProfile}
                        >
                          {isSavingProfile ? "Saving..." : "Save profile"}
                        </Button>
                      </div>
                    </form>

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

                      <p
                        className="mt-2 text-xs text-muted-foreground"
                        aria-live="polite"
                      >
                        {uploadMessage ?? " "}
                      </p>
                    </div>

                    <form
                      className="rounded-lg border bg-background/40 p-4"
                      onSubmit={(event) => {
                        void handlePasswordSubmit(event);
                      }}
                    >
                      <p className="text-sm font-medium">Change password</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use your current password, then choose a strong new password.
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="center-current-password"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Current password
                          </label>
                          <Input
                            id="center-current-password"
                            type="password"
                            autoComplete="current-password"
                            value={passwordForm.currentPassword}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setPasswordForm((previous) => ({
                                ...previous,
                                currentPassword: value,
                              }));
                              setPasswordMessage(null);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="center-new-password"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            New password
                          </label>
                          <Input
                            id="center-new-password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.newPassword}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setPasswordForm((previous) => ({
                                ...previous,
                                newPassword: value,
                              }));
                              setPasswordMessage(null);
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="center-confirm-password"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Confirm new password
                          </label>
                          <Input
                            id="center-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setPasswordForm((previous) => ({
                                ...previous,
                                confirmPassword: value,
                              }));
                              setPasswordMessage(null);
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p
                          className="text-xs text-muted-foreground"
                          aria-live="polite"
                        >
                          {passwordMessage ?? " "}
                        </p>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={
                            isSavingPassword ||
                            !passwordForm.currentPassword.trim() ||
                            !passwordForm.newPassword.trim() ||
                            !passwordForm.confirmPassword.trim()
                          }
                        >
                          {isSavingPassword ? "Updating..." : "Update password"}
                        </Button>
                      </div>
                    </form>
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

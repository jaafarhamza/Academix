"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Loader2, ShieldX, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UserDetailDialogState<TDetail> = {
  detail: TDetail | null;
  detailUserId: string | null;
  errorMessage: string | null;
  errorUserId: string | null;
};

type UserDetailDialogProps<TDetail> = {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userId: string | null;
  entityLabel: string;
  loadDetail: (userId: string) => Promise<TDetail>;
  getTitle: (detail: TDetail) => string;
  getSubtitle?: (detail: TDetail) => string | null;
  getIsActive?: (detail: TDetail) => boolean;
  renderDetail: (detail: TDetail) => ReactNode;
};

function getErrorMessage(error: unknown, entityLabel: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return `Unable to load ${entityLabel.toLowerCase()} details right now.`;
}

export function UserDetailDialog<TDetail>({
  open,
  onOpenChange,
  userId,
  entityLabel,
  loadDetail,
  getTitle,
  getSubtitle,
  getIsActive,
  renderDetail,
}: UserDetailDialogProps<TDetail>) {
  const [state, setState] = useState<UserDetailDialogState<TDetail>>({
    detail: null,
    detailUserId: null,
    errorMessage: null,
    errorUserId: null,
  });
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    if (!open || !userId) {
      return;
    }

    let isCancelled = false;

    void loadDetail(userId)
      .then((detail) => {
        if (isCancelled) {
          return;
        }

        setState({
          detail,
          detailUserId: userId,
          errorMessage: null,
          errorUserId: null,
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setState({
          detail: null,
          detailUserId: null,
          errorMessage: getErrorMessage(error, entityLabel),
          errorUserId: userId,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [entityLabel, loadDetail, open, reloadCounter, userId]);

  const isLoading =
    Boolean(open && userId) &&
    state.detailUserId !== userId &&
    state.errorUserId !== userId;
  const detail =
    userId && state.detailUserId === userId ? state.detail : null;
  const errorMessage =
    userId && state.errorUserId === userId ? state.errorMessage : null;

  const title = detail ? getTitle(detail) : `${entityLabel} Details`;
  const subtitle = detail && getSubtitle ? getSubtitle(detail) : null;
  const isActive =
    detail && getIsActive ? getIsActive(detail) : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entityLabel} Profile</DialogTitle>
          <DialogDescription>
            Full details from the secured backend endpoint.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading {entityLabel.toLowerCase()} details...
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{errorMessage}</p>
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

        {!isLoading && detail ? (
          <div className="space-y-3 rounded-lg border bg-card/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-base font-semibold">{title}</p>
                {subtitle ? (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>

              {typeof isActive === "boolean" ? (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium">
                  {isActive ? (
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
              ) : null}
            </div>

            {renderDetail(detail)}
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
  );
}

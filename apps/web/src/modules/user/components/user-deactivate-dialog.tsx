"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";

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

type UserDeactivateDialogProps = {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  entityLabel: string;
  userName: string;
  action: "activate" | "deactivate";
  onConfirm: () => Promise<void>;
};

function toErrorMessage(
  error: unknown,
  entityLabel: string,
  action: "activate" | "deactivate",
) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return `Unable to ${action} this ${entityLabel.toLowerCase()} right now.`;
}

export function UserDeactivateDialog({
  open,
  onOpenChange,
  entityLabel,
  userName,
  action,
  onConfirm,
}: UserDeactivateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedUserName = userName.trim() || `this ${entityLabel.toLowerCase()}`;
  const isActivateAction = action === "activate";
  const dialogTitle = `${isActivateAction ? "Activate" : "Deactivate"} ${entityLabel}`;
  const actionButtonLabel = `${isActivateAction ? "Activate" : "Deactivate"} ${entityLabel}`;
  const actionDescription = isActivateAction
    ? `Are you sure you want to activate ${normalizedUserName}? This will restore account access and mark the user as active.`
    : `Are you sure you want to deactivate ${normalizedUserName}? This will set the account status to inactive and block access to the workspace.`;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
    }

    onOpenChange(nextOpen);
  }

  async function handleConfirm() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onConfirm();
      handleOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(toErrorMessage(error, entityLabel, action));
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className={`size-4 ${isActivateAction ? "text-emerald-600" : "text-destructive"}`} />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{actionDescription}</DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={isActivateAction ? "default" : "destructive"}
            disabled={isSubmitting}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {isSubmitting
              ? `${isActivateAction ? "Activating" : "Deactivating"}...`
              : actionButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

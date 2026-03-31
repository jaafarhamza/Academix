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

type StudentGroupDeleteDialogProps = {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  groupName: string;
  onConfirm: () => Promise<void>;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unable to delete this student group right now.";
}

export function StudentGroupDeleteDialog({
  open,
  onOpenChange,
  groupName,
  onConfirm,
}: StudentGroupDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedGroupName = groupName.trim() || "this student group";

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
      setErrorMessage(toErrorMessage(error));
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
            <TriangleAlert className="size-4 text-destructive" />
            Delete Student Group
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete {normalizedGroupName}?
            This action cannot be undone.
          </DialogDescription>
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
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {isSubmitting ? "Deleting..." : "Delete Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

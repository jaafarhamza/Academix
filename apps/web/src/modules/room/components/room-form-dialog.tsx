"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, PencilLine, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  Room,
  RoomCreatePayload,
  RoomUpdatePayload,
} from "../types/room.types";

type RoomFormMode = "create" | "edit";

type RoomFormState = {
  floor: string;
  roomName: string;
  isAvailable: "true" | "false";
};

const emptyFormState: RoomFormState = {
  floor: "0",
  roomName: "",
  isAvailable: "true",
};

type RoomFormDialogProps = {
  mode: RoomFormMode;
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: RoomCreatePayload) => Promise<void>;
  onUpdate: (roomId: string, payload: RoomUpdatePayload) => Promise<void>;
};

function parseFloor(value: string) {
  const normalized = value.trim();
  if (!normalized.length) {
    throw new Error("Floor is required.");
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Floor must be a non-negative integer.");
  }

  return parsed;
}

function toFormState(mode: RoomFormMode, room: Room | null): RoomFormState {
  if (mode === "edit" && room) {
    return {
      floor: String(room.floor),
      roomName: room.roomName,
      isAvailable: room.isAvailable ? "true" : "false",
    };
  }

  return emptyFormState;
}

function buildCreatePayload(form: RoomFormState): RoomCreatePayload {
  return {
    floor: parseFloor(form.floor),
    roomName: form.roomName.trim(),
    isAvailable: form.isAvailable === "true",
  };
}

function buildUpdatePayload(form: RoomFormState, room: Room): RoomUpdatePayload {
  const payload: RoomUpdatePayload = {};

  const floor = parseFloor(form.floor);
  const roomName = form.roomName.trim();
  const isAvailable = form.isAvailable === "true";

  if (floor !== room.floor) {
    payload.floor = floor;
  }

  if (roomName.length > 0 && roomName !== room.roomName) {
    payload.roomName = roomName;
  }

  if (isAvailable !== room.isAvailable) {
    payload.isAvailable = isAvailable;
  }

  return payload;
}

export function RoomFormDialog({
  mode,
  room,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: RoomFormDialogProps) {
  const [form, setForm] = useState<RoomFormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(toFormState(mode, room));
    setErrorMessage(null);
  }, [mode, open, room]);

  const title = useMemo(
    () => (isEditMode ? "Edit Room" : "Create Room"),
    [isEditMode],
  );
  const description = useMemo(
    () =>
      isEditMode
        ? "Update room details and availability."
        : "Create a room with floor, name, and availability status.",
    [isEditMode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditMode) {
        if (!room) {
          throw new Error("Room context is missing.");
        }

        const payload = buildUpdatePayload(form, room);
        if (Object.keys(payload).length === 0) {
          throw new Error("No fields changed.");
        }

        await onUpdate(room.id, payload);
      } else {
        const payload = buildCreatePayload(form);
        await onCreate(payload);
      }

      onOpenChange(false);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to submit room form right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Floor</span>
              <Input
                name="floor"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.floor}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((previous) => ({
                    ...previous,
                    floor: value,
                  }));
                }}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Availability</span>
              <select
                value={form.isAvailable}
                onChange={(event) => {
                  const value = event.currentTarget.value as "true" | "false";
                  setForm((previous) => ({
                    ...previous,
                    isAvailable: value,
                  }));
                }}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">Room name</span>
            <Input
              name="roomName"
              value={form.roomName}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setForm((previous) => ({
                  ...previous,
                  roomName: value,
                }));
              }}
              minLength={2}
              maxLength={80}
              required
            />
          </label>

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                <>
                  <PencilLine className="size-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create room
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function ToastProvider({
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return <ToastPrimitive.Provider data-slot="toast-provider" {...props} />;
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed right-0 bottom-0 z-80 flex w-full max-w-md flex-col gap-2 p-4 sm:right-0 sm:bottom-0",
        className,
      )}
      {...props}
    />
  );
}

function Toast({
  className,
  variant = "info",
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> & {
  variant?: "success" | "error" | "info";
}) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-variant={variant}
      className={cn(
        "group relative grid w-full gap-1 overflow-hidden rounded-lg border bg-background p-4 pr-8 shadow-lg transition-all data-open:animate-in data-open:fade-in data-open:slide-in-from-bottom-3 data-closed:animate-out data-closed:fade-out data-closed:slide-out-to-right-full data-[variant=success]:border-emerald-500/35 data-[variant=success]:bg-emerald-500/10 data-[variant=error]:border-destructive/40 data-[variant=error]:bg-destructive/10 data-[variant=info]:border-border",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      asChild
      {...props}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn("absolute top-2 right-2", className)}
      >
        <XIcon />
        <span className="sr-only">Close notification</span>
      </Button>
    </ToastPrimitive.Close>
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
};

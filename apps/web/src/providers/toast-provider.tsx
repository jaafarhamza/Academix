"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  duration?: number;
  variant?: ToastVariant;
};

type ToastRecord = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  notify: (toast: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
};

type AppToastProviderProps = {
  children: ReactNode;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVariantIcon(variant: ToastVariant) {
  if (variant === "success") {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }

  if (variant === "error") {
    return <CircleAlert className="size-4 text-destructive" />;
  }

  return <Info className="size-4 text-primary" />;
}

export function AppToastProvider({ children }: AppToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: ToastInput) => {
    const id = createToastId();
    const nextToast: ToastRecord = {
      id,
      title: toast.title,
      description: toast.description,
      duration: toast.duration ?? 4500,
      variant: toast.variant ?? "info",
    };

    setToasts((previous) => [...previous.slice(-3), nextToast]);
    return id;
  }, []);

  const success = useCallback(
    (title: string, description?: string) =>
      notify({
        title,
        description,
        variant: "success",
      }),
    [notify],
  );

  const error = useCallback(
    (title: string, description?: string) =>
      notify({
        title,
        description,
        variant: "error",
        duration: 6000,
      }),
    [notify],
  );

  const info = useCallback(
    (title: string, description?: string) =>
      notify({
        title,
        description,
        variant: "info",
      }),
    [notify],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success,
      error,
      info,
      dismiss,
    }),
    [dismiss, error, info, notify, success],
  );

  return (
    <ToastProvider swipeDirection="right">
      <ToastContext.Provider value={value}>
        {children}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            open
            variant={toast.variant}
            duration={toast.duration}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                dismiss(toast.id);
              }
            }}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5">{getVariantIcon(toast.variant)}</span>
              <div className="grid gap-1">
                <ToastTitle>{toast.title}</ToastTitle>
                {toast.description ? (
                  <ToastDescription>{toast.description}</ToastDescription>
                ) : null}
              </div>
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastContext.Provider>
    </ToastProvider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within AppToastProvider");
  }

  return context;
}

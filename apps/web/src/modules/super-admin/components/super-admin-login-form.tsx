"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSuperAdmin } from "../client/super-admin-auth-client";


export function SuperAdminLoginForm() {
  const router = useRouter();
  const { setUser } = useAppAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const authResponse = await loginSuperAdmin({
        email,
        password,
      });

      setUser({
        id: authResponse.superAdmin.id,
        role: "SUPER_ADMIN",
        fullName: `${authResponse.superAdmin.firstName} ${authResponse.superAdmin.lastName}`,
        email: authResponse.superAdmin.email,
      });

      router.replace("/super-admin");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.trim().length > 0) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to login as super admin.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label
          htmlFor="super-admin-email"
          className="text-sm font-medium"
        >
          Email
        </label>
        <Input
          id="super-admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="super-admin-password"
          className="text-sm font-medium"
        >
          Password
        </label>
        <Input
          id="super-admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
        />
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in as Super Admin"}
      </Button>
    </form>
  );
}

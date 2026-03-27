"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginCenter } from "../client/center-auth-client";


export function CenterLoginForm() {
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
      const authResponse = await loginCenter({
        email,
        password,
      });

      setUser({
        id: authResponse.center.id,
        centerId: authResponse.center.id,
        role: "ADMIN",
        fullName: authResponse.center.centerName,
        email: authResponse.center.email,
      });

      router.replace("/center");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.trim().length > 0) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to login as center admin.");
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
          htmlFor="center-email"
          className="text-sm font-medium"
        >
          Email
        </label>
        <Input
          id="center-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="center-password"
          className="text-sm font-medium"
        >
          Password
        </label>
        <Input
          id="center-password"
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
        {isSubmitting ? "Signing in..." : "Sign in to your center"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have a center account?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/center/register"
        >
          Register now
        </Link>
      </p>
    </form>
  );
}

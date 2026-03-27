"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerCenter } from "../client/center-auth-client";

type RegistrationFormState = {
  firstName: string;
  lastName: string;
  centerName: string;
  email: string;
  password: string;
  phone: string;
};

const initialState: RegistrationFormState = {
  firstName: "",
  lastName: "",
  centerName: "",
  email: "",
  password: "",
  phone: "",
};

export function CenterRegisterForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<RegistrationFormState>(initialState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await registerCenter({
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        centerName: formState.centerName.trim(),
        email: formState.email.trim(),
        password: formState.password,
        phone: formState.phone.trim(),
      });

      setSuccessMessage("Center account created. You can now sign in.");
      router.push("/center/login");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.trim().length > 0) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to register center.");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="center-first-name"
            className="text-sm font-medium"
          >
            First name
          </label>
          <Input
            id="center-first-name"
            value={formState.firstName}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setFormState((previous) => ({
                ...previous,
                firstName: value,
              }));
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="center-last-name"
            className="text-sm font-medium"
          >
            Last name
          </label>
          <Input
            id="center-last-name"
            value={formState.lastName}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setFormState((previous) => ({
                ...previous,
                lastName: value,
              }));
            }}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="center-name"
          className="text-sm font-medium"
        >
          Center name
        </label>
        <Input
          id="center-name"
          value={formState.centerName}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFormState((previous) => ({
              ...previous,
              centerName: value,
            }));
          }}
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="center-register-email"
          className="text-sm font-medium"
        >
          Email
        </label>
        <Input
          id="center-register-email"
          type="email"
          autoComplete="email"
          value={formState.email}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFormState((previous) => ({
              ...previous,
              email: value,
            }));
          }}
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="center-register-password"
          className="text-sm font-medium"
        >
          Password
        </label>
        <Input
          id="center-register-password"
          type="password"
          autoComplete="new-password"
          value={formState.password}
          minLength={8}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFormState((previous) => ({
              ...previous,
              password: value,
            }));
          }}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use at least 8 characters with uppercase, lowercase, number, and symbol.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="center-phone"
          className="text-sm font-medium"
        >
          Phone
        </label>
        <Input
          id="center-phone"
          type="tel"
          value={formState.phone}
          pattern="^\+?[1-9]\d{7,14}$"
          title="Use international format, for example +212600000010"
          placeholder="+212600000010"
          onChange={(event) => {
            const value = event.currentTarget.value;
            setFormState((previous) => ({
              ...previous,
              phone: value,
            }));
          }}
          required
        />
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {successMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating center..." : "Create center account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/center/login"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

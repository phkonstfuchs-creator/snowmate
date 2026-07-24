"use client";

import Link from "next/link";
import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { initialAuthActionState } from "./action-state";
import { signInAction, signUpAction } from "./actions";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialAuthActionState,
  );
  const isSignup = mode === "signup";

  if (state.status === "success") {
    return (
      <div aria-live="polite" className="space-y-5">
        <div
          className="rounded-lg border px-4 py-4"
          style={{
            background: "var(--accent-primary-subtle)",
            borderColor: "rgba(79,195,240,0.35)",
          }}
        >
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>
            Request received
          </p>
          <p
            className="mt-1 text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {state.message}
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm font-bold"
          style={{ color: "var(--accent-primary)" }}
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.email}
        error={state.fieldErrors?.email?.[0]}
        disabled={isPending}
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        helper={
          isSignup
            ? "12+ characters with uppercase, lowercase and a number"
            : undefined
        }
        error={state.fieldErrors?.password?.[0]}
        disabled={isPending}
        required
      />
      {isSignup ? (
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword?.[0]}
          disabled={isPending}
          required
        />
      ) : null}

      {state.status === "error" ? (
        <p
          aria-live="polite"
          className="text-sm font-semibold"
          style={{ color: "var(--status-danger)" }}
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isPending}
      >
        {isPending
          ? isSignup
            ? "Creating account..."
            : "Signing in..."
          : isSignup
            ? "Create account"
            : "Log in"}
      </Button>

      <p
        className="text-center text-sm"
        style={{ color: "var(--text-tertiary)" }}
      >
        {isSignup ? "Already have an account?" : "New to Snowmate?"}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-bold"
          style={{ color: "var(--accent-primary)" }}
        >
          {isSignup ? "Log in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}

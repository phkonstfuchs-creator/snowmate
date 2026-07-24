import Link from "next/link";
import PenguinMascot from "@/components/PenguinMascot";
import AuthForm from "./AuthForm";

interface AuthScreenProps {
  mode: "login" | "signup";
  confirmationFailed?: boolean;
}

export default function AuthScreen({
  mode,
  confirmationFailed = false,
}: AuthScreenProps) {
  const isSignup = mode === "signup";

  return (
    <main
      className="min-h-dvh px-6 py-8"
      style={{ background: "var(--bg-canvas)" }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col">
        <Link
          href="/onboarding"
          aria-label="Back to onboarding"
          className="flex w-fit items-center gap-2"
        >
          <PenguinMascot size={30} />
          <span
            className="font-display text-lg font-extrabold"
            style={{ color: "var(--text-primary)" }}
          >
            Snowmate
          </span>
        </Link>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <p
              className="mb-2 text-xs font-black uppercase"
              style={{
                color: "var(--accent-primary)",
                letterSpacing: 0,
              }}
            >
              {isSignup ? "Join the crew" : "Welcome back"}
            </p>
            <h1
              className="font-display text-4xl font-extrabold"
              style={{ color: "var(--text-primary)", letterSpacing: 0 }}
            >
              {isSignup ? "Create your account" : "Log in"}
            </h1>
            <p
              className="mt-3 text-base leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {isSignup
                ? "Your profile details come next. First, secure your account."
                : "Pick up where your crew left off."}
            </p>
          </div>

          {confirmationFailed ? (
            <p
              role="alert"
              className="mb-5 rounded-lg border px-4 py-3 text-sm font-semibold"
              style={{
                color: "var(--status-danger)",
                borderColor: "var(--status-danger)",
                background: "var(--bg-surface-1)",
              }}
            >
              That confirmation link is invalid or expired.
            </p>
          ) : null}

          <AuthForm mode={mode} />
        </div>
      </div>
    </main>
  );
}

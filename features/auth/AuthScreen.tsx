import Link from "next/link";
import PenguinMascot from "@/components/PenguinMascot";
import Icon from "@/components/ui/Icon";
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
          className="-my-2.5 flex w-fit items-center gap-2 py-2.5"
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
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border px-4 py-3"
              style={{
                borderColor: "var(--status-danger)",
                background: "var(--bg-surface-1)",
              }}
            >
              <Icon
                name="alert-circle"
                size={18}
                color="var(--status-danger)"
                className="mt-0.5 flex-shrink-0"
              />
              <p
                className="text-sm font-semibold leading-relaxed"
                style={{ color: "var(--status-danger)" }}
              >
                That confirmation link is invalid or expired. Log in below,
                or sign up again to request a new one.
              </p>
            </div>
          ) : null}

          <AuthForm mode={mode} />
        </div>
      </div>
    </main>
  );
}

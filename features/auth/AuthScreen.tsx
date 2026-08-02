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
      className="min-h-dvh"
      style={{ background: "var(--ink-0)" }}
    >
      <div
        className="paper-grain mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-8"
        style={{ background: "var(--paper-0)" }}
      >
        <Link
          href="/onboarding"
          aria-label="Zurück zur Startseite"
          className="-my-2 flex w-fit items-center gap-2 py-2 pt-6"
        >
          <PenguinMascot size={26} />
          <span className="text-mono-label" style={{ color: "var(--ink-0)" }}>
            Snowmate
          </span>
        </Link>

        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="text-mono-label" style={{ color: "var(--rust)" }}>
            {isSignup ? "Werde Teil der Crew" : "Willkommen zurück"}
          </p>
          <h1
            className="text-display-lg mt-3"
            style={{ color: "var(--ink-0)" }}
          >
            {/* Leerzeichen vor dem Umbruch, sonst liest der Screenreader
                "Accounterstellen" als einen Namen */}
            {isSignup ? (
              <>
                Account{" "}
                <br />
                erstellen
              </>
            ) : (
              "Anmelden"
            )}
          </h1>
          <p
            className="mt-3 text-base leading-relaxed"
            style={{ color: "var(--ink-1)" }}
          >
            {isSignup
              ? "Zuerst dein Zugang. Die Profildaten kommen gleich danach."
              : "Mach dort weiter, wo deine Crew aufgehört hat."}
          </p>

          <div
            className="mt-6 mb-6"
            style={{ borderTop: "var(--rule-thin)" }}
            aria-hidden="true"
          />

          {confirmationFailed ? (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 px-4 py-3"
              style={{
                border: "1px solid var(--crimson)",
                background: "var(--paper-1)",
              }}
            >
              <Icon
                name="alert-circle"
                size={18}
                color="var(--crimson)"
                className="mt-0.5 flex-shrink-0"
              />
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--crimson)" }}
              >
                Dieser Bestätigungslink ist ungültig oder abgelaufen. Melde dich
                unten an oder registriere dich erneut.
              </p>
            </div>
          ) : null}

          <AuthForm mode={mode} />
        </div>
      </div>
    </main>
  );
}

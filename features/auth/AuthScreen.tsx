"use client";

import Link from "next/link";
import LegalLinks from "@/features/legal/LegalLinks";
import { useT } from "@/lib/i18n/client";
import PenguinMascot from "@/components/PenguinMascot";
import Icon from "@/components/ui/Icon";
import AuthForm from "./AuthForm";

interface AuthScreenProps {
  mode: "login" | "signup";
  confirmationFailed?: boolean;
  accountDeleted?: boolean;
}

export default function AuthScreen({
  mode,
  confirmationFailed = false,
  accountDeleted = false,
}: AuthScreenProps) {
  const isSignup = mode === "signup";
  const t = useT();

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
          aria-label={t("auth.backToStart")}
          className="-my-2 flex w-fit items-center gap-2 py-2 pt-6"
        >
          <PenguinMascot size={26} />
          <span className="text-mono-label" style={{ color: "var(--ink-0)" }}>
            Pistl
          </span>
        </Link>

        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="text-mono-label" style={{ color: "var(--rust)" }}>
            {isSignup ? t("auth.joinCrew") : t("auth.welcomeBack")}
          </p>
          <h1
            className="text-display-lg mt-3"
            style={{ color: "var(--ink-0)" }}
          >
            {/* Space before the break, otherwise a screen reader reads
                "Createaccount" as a single word */}
            {isSignup ? (
              <>
                {t("auth.createAccountLine1")}{" "}
                <br />
                {t("auth.createAccountLine2")}
              </>
            ) : (
              t("auth.signIn")
            )}
          </h1>
          <p
            className="mt-3 text-base leading-relaxed"
            style={{ color: "var(--ink-1)" }}
          >
            {isSignup
              ? t("auth.signupLead")
              : t("auth.loginLead")}
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
                {t("auth.confirmationFailed")}
              </p>
            </div>
          ) : null}

          {accountDeleted ? (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 px-4 py-3"
              style={{ border: "var(--rule-thin)", background: "var(--paper-1)" }}
            >
              <Icon name="check" size={18} color="var(--pine)" className="mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-1)" }}>
                {t("auth.accountDeleted")}
              </p>
            </div>
          ) : null}

          <AuthForm mode={mode} />
          <LegalLinks className="mt-8" />
        </div>
      </div>
    </main>
  );
}

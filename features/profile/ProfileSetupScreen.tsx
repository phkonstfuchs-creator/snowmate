import PenguinMascot from "@/components/PenguinMascot";
import type { ProfileSetupValues } from "./schema";
import ProfileAccessActions from "./ProfileAccessActions";
import ProfileSetupForm from "./ProfileSetupForm";

interface ProfileSetupScreenProps {
  initialValues: ProfileSetupValues;
}

export default function ProfileSetupScreen({
  initialValues,
}: ProfileSetupScreenProps) {
  return (
    <main className="min-h-dvh" style={{ background: "var(--ink-0)" }}>
      <div
        className="paper-grain mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-8"
        style={{ background: "var(--paper-0)" }}
      >
        <div className="flex items-center gap-2 pt-6">
          <PenguinMascot size={26} />
          <span className="text-mono-label" style={{ color: "var(--ink-0)" }}>
            Snowmate
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="text-mono-label" style={{ color: "var(--rust)" }}>
            Account gesichert · Profil fehlt
          </p>
          <h1 className="text-display-lg mt-3" style={{ color: "var(--ink-0)" }}>
            Jetzt wirst{" "}
            <br />
            du sichtbar
          </h1>
          <p
            className="mt-3 text-base leading-relaxed"
            style={{ color: "var(--ink-1)" }}
          >
            Dein Login steht. Ergänze jetzt die Angaben, mit denen dich deine
            Crew in Snowmate erkennt.
          </p>

          <div
            className="mt-6 mb-6"
            style={{ borderTop: "var(--rule-thin)" }}
            aria-hidden="true"
          />

          <ProfileSetupForm initialValues={initialValues} />

          <ProfileAccessActions showRetry={false} />
        </div>
      </div>
    </main>
  );
}

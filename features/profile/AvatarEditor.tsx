"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { removeAvatarAction, setAvatarVisibilityAction, uploadAvatarAction, type AvatarOutcome } from "./avatar-actions";
import { AVATAR_MAX_BYTES, AVATAR_SIZE_PX, centerCrop } from "./avatar-image";
import type { AvatarVisibility, OwnProfile } from "./profile-input";

const OUTCOME: Record<Exclude<AvatarOutcome, "saved">, MessageKey> = {
  invalid: "avatar.invalid",
  too_large: "avatar.tooLarge",
  unauthenticated: "profile.sessionEnded",
  unavailable: "avatar.failed",
};

/* Square crop, 512 px, re-encoded: drops EXIF (GPS, camera) on the way. */
async function prepare(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const [sx, sy, side] = centerCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE_PX;
    canvas.height = AVATAR_SIZE_PX;
    canvas.getContext("2d")?.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
    bitmap.close();
    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    /* Some Safari versions cannot encode WebP and return PNG instead. */
    const webp = await encode("image/webp", 0.85);
    return webp?.type === "image/webp" ? webp : await encode("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

export default function AvatarEditor({ profile }: { profile: OwnProfile }) {
  const t = useT();
  const router = useRouter();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [version, setVersion] = useState(profile.avatarPath ?? null);
  const [visibility, setVisibility] = useState<AvatarVisibility>(profile.avatarVisibility ?? "friends");
  const id = profile.id;
  if (!id) return null;

  const report = (outcome: AvatarOutcome) => {
    setMessage(outcome === "saved" ? { text: t("avatar.saved"), error: false } : { text: t(OUTCOME[outcome]), error: true });
  };

  const choose = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setMessage(null);
    const blob = await prepare(file);
    if (!blob) {
      setBusy(false);
      report("invalid");
      return;
    }
    if (blob.size > AVATAR_MAX_BYTES) {
      setBusy(false);
      report("too_large");
      return;
    }
    const form = new FormData();
    form.append("avatar", blob, blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
    const outcome = await uploadAvatarAction(form);
    setBusy(false);
    report(outcome);
    if (outcome === "saved") {
      setVersion(String(Date.now()));
      router.refresh();
    }
  };

  const remove = async () => {
    setBusy(true);
    const outcome = await removeAvatarAction();
    setBusy(false);
    report(outcome);
    if (outcome === "saved") {
      setVersion(null);
      router.refresh();
    }
  };

  const changeVisibility = async (next: AvatarVisibility) => {
    setVisibility(next);
    report(await setAvatarVisibilityAction(next));
  };

  return (
    <section className="px-5 pt-5" aria-labelledby={`${inputId}-title`}>
      <h3 id={`${inputId}-title`} className="text-mono-label" style={{ color: "var(--ink-2)" }}>{t("avatar.title")}</h3>
      <div className="mt-2 flex items-center gap-4">
        <Avatar key={version ?? "none"} id={id} version={version} initials={(profile.displayName ?? profile.handle ?? "?").slice(0, 2).toUpperCase()} size={64} />
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className="flex min-h-11 cursor-pointer items-center px-3.5 text-sm font-semibold"
            style={{ background: "var(--ink-0)", color: "var(--paper-0)", borderRadius: 5, opacity: busy ? 0.5 : 1 }}
          >
            {busy ? t("avatar.uploading") : version ? t("avatar.change") : t("avatar.choose")}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {version && (
            <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-11 px-3.5 text-sm font-semibold" style={{ border: "var(--rule-thin)", color: "var(--ink-1)" }}>
              {t("avatar.remove")}
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--ink-2)" }}>{t("avatar.exifNote")}</p>

      <fieldset className="mt-3">
        <legend className="text-sm font-semibold" style={{ color: "var(--ink-0)" }}>{t("avatar.whoSees")}</legend>
        {profile.isMinor ? (
          <p className="mt-1 text-sm" style={{ color: "var(--ink-1)" }}>{t("avatar.minorNote")}</p>
        ) : (
          (["friends", "contacts"] as const).map((option) => (
            <label key={option} className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm" style={{ color: "var(--ink-1)" }}>
              <input
                type="radio"
                name="avatar-visibility"
                checked={visibility === option}
                onChange={() => void changeVisibility(option)}
                style={{ accentColor: "var(--rust)", width: 18, height: 18 }}
              />
              {t(option === "friends" ? "avatar.friends" : "avatar.contacts")}
            </label>
          ))
        )}
      </fieldset>
      {message && (
        <p role={message.error ? "alert" : "status"} className="mt-2 text-sm" style={{ color: message.error ? "var(--crimson)" : "var(--pine)" }}>
          {message.text}
        </p>
      )}
    </section>
  );
}

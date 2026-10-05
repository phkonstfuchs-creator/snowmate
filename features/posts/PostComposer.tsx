"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { resortNamesIn } from "@/lib/resorts";
import type { City } from "@/lib/types";
import { createPostAction } from "./actions";
import { MAX_POST_LENGTH, POST_PHOTO_MAX_BYTES, POST_PHOTO_MAX_SIDE, fitWithin, normalizePostBody, type CreatePostOutcome } from "./post";

const OUTCOME: Record<Exclude<CreatePostOutcome, "created">, MessageKey> = {
  invalid: "posts.invalid",
  rate_limited: "posts.rateLimited",
  profile_incomplete: "common.profileIncomplete",
  unauthenticated: "profile.sessionEnded",
  too_large: "posts.tooLarge",
  unavailable: "posts.failed",
};

/* Shrinks and re-encodes the photo in the browser: smaller uploads, and
   EXIF data such as the GPS position is dropped. */
async function preparePhoto(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const [width, height] = fitWithin(bitmap.width, bitmap.height, POST_PHOTO_MAX_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
    const webp = await encode("image/webp");
    return webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  } catch {
    return null;
  }
}

export default function PostComposer({ city, onClose }: { city: City; onClose: () => void }) {
  useScrollLock();
  const t = useT();
  const router = useRouter();
  const ids = useId();
  const { state, dismiss } = useSheetDismiss(onClose);
  const panelRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [body, setBody] = useState("");
  const [resort, setResort] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const blob = await preparePhoto(file);
    if (!blob) return setError(t("posts.invalid"));
    if (blob.size > POST_PHOTO_MAX_BYTES) return setError(t("posts.tooLarge"));
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(blob);
    setPreview(URL.createObjectURL(blob));
  };

  const submit = async () => {
    if (busy || normalizePostBody(body) === null) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("body", body);
    if (resort) form.append("resort", resort);
    if (photo) form.append("photo", photo, photo.type === "image/webp" ? "photo.webp" : "photo.jpg");
    const outcome = await createPostAction(form).catch((): CreatePostOutcome => "unavailable");
    setBusy(false);
    if (outcome === "created") {
      router.refresh();
      dismiss();
    } else {
      setError(t(OUTCOME[outcome]));
    }
  };

  const remaining = MAX_POST_LENGTH - [...body].length;

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={panelRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-labelledby={`${ids}-title`} tabIndex={-1} style={{ maxHeight: "92dvh", overflowY: "auto" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 id={`${ids}-title`} className="text-display-md">{t("posts.new")}</h2>
          <button type="button" onClick={dismiss} aria-label={t("common.close")} className="flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color="var(--ink-2)" />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-6">
          <div>
            <label htmlFor={`${ids}-body`} className="text-mono-label" style={{ color: "var(--ink-2)" }}>{t("posts.text")}</label>
            <textarea
              id={`${ids}-body`}
              value={body}
              maxLength={MAX_POST_LENGTH}
              rows={3}
              placeholder={t("posts.placeholder")}
              onChange={(event) => setBody(event.target.value)}
              className="form-input mt-1 resize-none"
            />
            {remaining < 80 && <p className="mt-1 text-right text-xs" style={{ color: "var(--ink-2)" }}>{t("chat.remaining", { n: remaining })}</p>}
          </div>
          <div>
            <label htmlFor={`${ids}-resort`} className="text-mono-label" style={{ color: "var(--ink-2)" }}>{t("posts.resortOptional")}</label>
            <select id={`${ids}-resort`} value={resort} onChange={(event) => setResort(event.target.value)} className="form-input mt-1">
              <option value="">{t("posts.noResort")}</option>
              {resortNamesIn(city).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            {preview ? (
              <div className="relative overflow-hidden" style={{ borderRadius: 10 }}>
                <Image src={preview} alt={t("posts.photoPreview")} width={800} height={600} unoptimized className="w-full object-cover" style={{ maxHeight: 260, height: "auto" }} />
                <button type="button" onClick={() => { setPhoto(null); setPreview(null); }} className="absolute right-2 top-2 flex h-9 items-center px-3 text-sm font-semibold" style={{ background: "var(--paper-1)", borderRadius: 5 }}>
                  {t("avatar.remove")}
                </button>
              </div>
            ) : (
              <label htmlFor={`${ids}-photo`} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 text-sm font-semibold" style={{ border: "1px dashed var(--paper-3)", borderRadius: 10, color: "var(--ink-1)", padding: "14px" }}>
                <Icon name="plus" size={16} /> {t("posts.addPhoto")}
              </label>
            )}
            <input id={`${ids}-photo`} type="file" accept="image/*" className="sr-only" onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
            <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>{t("posts.whoSees")}</p>
          </div>
          {error && <p role="alert" className="text-sm" style={{ color: "var(--crimson)" }}>{error}</p>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || normalizePostBody(body) === null}
            className="flex min-h-12 w-full items-center justify-center text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--rust)", color: "var(--paper-0)", borderRadius: 5 }}
          >
            {busy ? t("common.publishing") : t("posts.share")}
          </button>
        </div>
      </div>
    </>
  );
}

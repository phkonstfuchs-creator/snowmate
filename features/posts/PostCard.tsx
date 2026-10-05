"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { initialsFor } from "@/features/profile/profile-input";
import ReportBlockSheet from "@/features/safety/ReportBlockSheet";
import { deletePostAction } from "./actions";
import type { Post } from "./post";

/* One ski-day post: who, when, where, the text and the photo. Own posts
   can be deleted; others can be reported. */
export default function PostCard({ post }: { post: Post }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const when = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(post.createdAt));

  const remove = async () => {
    if (!window.confirm(t("posts.confirmDelete"))) return;
    setBusy(true);
    const ok = await deletePostAction(post.id).catch(() => false);
    setBusy(false);
    if (ok) router.refresh();
  };

  return (
    <article className="overflow-hidden" style={{ background: "var(--paper-1)", border: "var(--rule-thin)" }}>
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar id={post.authorId} initials={initialsFor(post.authorName, post.authorHandle)} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: "var(--ink-0)" }}>{post.authorName}</p>
          <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
            {when}{post.resort ? ` · ${post.resort}` : ""}
          </p>
        </div>
        {post.isMine ? (
          <button type="button" onClick={() => void remove()} disabled={busy} aria-label={t("posts.delete")} className="flex h-11 w-11 items-center justify-center disabled:opacity-50">
            <Icon name="trash-2" size={16} color="var(--ink-2)" />
          </button>
        ) : (
          <button type="button" onClick={() => setReporting(true)} aria-label={t("chat.reportOrBlock", { name: post.authorName })} className="flex h-11 w-11 items-center justify-center">
            <Icon name="more-horizontal" size={16} color="var(--ink-2)" />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words px-4 pt-3 pb-4 text-[0.9375rem] leading-snug" style={{ color: "var(--ink-1)" }}>{post.body}</p>
      {post.hasPhoto && !photoFailed && (
        <Image
          src={`/post-photo/${post.id}`}
          alt={t("posts.photoOf", { name: post.authorName })}
          width={800}
          height={600}
          unoptimized
          loading="lazy"
          onError={() => setPhotoFailed(true)}
          className="w-full object-cover"
          style={{ height: "auto", maxHeight: 420 }}
        />
      )}
      {reporting && <ReportBlockSheet target={{ userId: post.authorId, name: post.authorName }} onClose={() => setReporting(false)} />}
    </article>
  );
}

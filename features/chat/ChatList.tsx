"use client";

import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { useLocale, useT } from "@/lib/i18n/client";
import { initialsFor } from "@/features/profile/profile-input";
import { chatTitle } from "./chat-title";
import type { ChatSummary } from "./message";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";

export default function ChatList({ chats }: { chats: ChatSummary[] | null }) {
  const t = useT();
  const locale = useLocale();

  return (
    <section className="px-4 pt-5" aria-labelledby="chat-list-title">
      <div className="section-rule">
        <h2 id="chat-list-title" className="text-mono-label" style={{ color: INK }}>{t("chat.title")}</h2>
        <span className="text-mono-label" style={{ color: INK_2 }}>{chats?.length ?? 0}</span>
      </div>
      {chats === null ? (
        <p className="mt-2 text-sm" style={{ color: "var(--crimson)" }}>{t("chat.loadFailed")}</p>
      ) : chats.length === 0 ? (
        <p className="mt-2 px-3 py-4 text-sm" style={{ color: INK_2, border: "1px dashed var(--paper-3)" }}>{t("chat.empty")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {chats.map((chat) => {
            const { title, subtitle } = chatTitle(chat, t, locale);
            const preview = chat.lastBody ? `${chat.lastIsMine ? `${t("chat.you")}: ` : ""}${chat.lastBody}` : subtitle ?? "";
            return (
              <li key={chat.id}>
                <Link
                  href={`/crew/chat/${chat.id}`}
                  className="card-tap flex items-center gap-3 px-3 py-3"
                  style={{ border: "var(--rule-thin)", background: "var(--paper-1)" }}
                >
                  {chat.kind === "direct" && chat.otherUserId ? (
                    <Avatar id={chat.otherUserId} initials={initialsFor(chat.otherName, chat.otherHandle)} size={40} />
                  ) : (
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={{ background: "var(--ink-0)" }} aria-hidden="true">
                      <Icon name="users" size={18} color="var(--paper-0)" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold" style={{ color: INK }}>{title}</span>
                    <span className={`block truncate text-xs ${chat.unread > 0 ? "font-bold" : ""}`} style={{ color: chat.unread > 0 ? INK : INK_2 }}>
                      {preview}
                    </span>
                  </span>
                  {chat.unread > 0 && (
                    <span
                      className="text-mono-label flex h-5 min-w-5 items-center justify-center px-1"
                      style={{ background: "var(--rust)", color: "var(--paper-0)", fontSize: "0.65rem" }}
                      aria-label={t("chat.unread", { n: chat.unread })}
                    >
                      {chat.unread > 9 ? "9+" : chat.unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

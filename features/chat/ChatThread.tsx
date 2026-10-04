"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/translate";
import ReportBlockSheet from "@/features/safety/ReportBlockSheet";
import type { SafetyTarget } from "@/features/safety/reports";
import { pollMessagesAction, sendMessageAction } from "./actions";
import { MAX_MESSAGE_LENGTH, POLL_INTERVAL_MS, mergeMessages, normalizeMessage, type ChatMessage } from "./message";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const PAPER = "var(--paper-0)";
const PAPER_1 = "var(--paper-1)";
const RUST = "var(--rust)";

const SEND_ERRORS: Record<string, MessageKey> = {
  forbidden: "chat.forbidden",
  invalid: "chat.invalid",
  rate_limited: "chat.rateLimited",
  profile_incomplete: "chat.profileIncomplete",
  unavailable: "chat.sendFailed",
};

export default function ChatThread({
  conversationId,
  title,
  subtitle,
  initialMessages,
  other,
}: {
  conversationId: string;
  title: string;
  subtitle?: string;
  initialMessages: ChatMessage[];
  /* Direct chats: the other person, for report/block. */
  other?: { id: string; name: string } | null;
}) {
  const t = useT();
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const latest = useRef<string | null>(initialMessages.at(-1)?.createdAt ?? null);

  const time = new Intl.DateTimeFormat(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });

  const poll = useCallback(async () => {
    const incoming = await pollMessagesAction(conversationId, latest.current);
    if (!incoming || incoming.length === 0) return;
    latest.current = incoming.at(-1)?.createdAt ?? latest.current;
    setMessages((current) => mergeMessages(current, incoming));
  }, [conversationId]);

  /* Marks the chat read on open, then refreshes while the page is visible. */
  useEffect(() => {
    void pollMessagesAction(conversationId, null);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [conversationId, poll]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = normalizeMessage(draft);
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const outcome = await sendMessageAction(conversationId, body);
    setSending(false);
    if (outcome === "sent") {
      setDraft("");
      await poll();
    } else {
      setError(t(SEND_ERRORS[outcome] ?? "chat.sendFailed"));
    }
  };

  const remaining = MAX_MESSAGE_LENGTH - [...draft].length;

  return (
    <div className="flex min-h-[calc(100dvh-84px)] flex-col">
      <header className="sticky top-0 z-50 flex items-center gap-2 px-2 py-2" style={{ background: PAPER, borderBottom: "var(--rule-heavy)" }}>
        <Link href="/crew" aria-label={t("chat.back")} className="flex h-11 w-11 items-center justify-center">
          <Icon name="chevron-left" size={20} color={INK} strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-extrabold" style={{ color: INK }}>{title}</h1>
          {subtitle && <p className="truncate text-xs font-semibold" style={{ color: INK_2 }}>{subtitle}</p>}
        </div>
        {other && (
          <button
            type="button"
            onClick={() => setSafetyTarget({ userId: other.id, name: other.name })}
            aria-label={t("chat.reportOrBlock", { name: other.name })}
            className="flex h-11 w-11 items-center justify-center"
          >
            <Icon name="more-horizontal" size={18} color={INK_2} strokeWidth={2} />
          </button>
        )}
      </header>

      <ol className="flex-1 space-y-2 px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <li className="py-10 text-center text-sm" style={{ color: INK_2 }}>{t("chat.noMessages")}</li>
        )}
        {messages.map((message, index) => {
          const showName = !message.isMine && messages[index - 1]?.senderId !== message.senderId;
          return (
            <li key={message.id} className={message.isMine ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[80%]">
                {showName && <p className="mb-0.5 text-[0.7rem] font-bold" style={{ color: INK_2 }}>{message.senderName}</p>}
                <div
                  className="whitespace-pre-wrap break-words px-3 py-2 text-[0.9375rem] leading-snug"
                  style={message.isMine
                    ? { background: INK, color: PAPER }
                    : { background: PAPER_1, color: INK, border: "var(--rule-thin)" }}
                >
                  {message.body}
                </div>
                <p className={`mt-0.5 text-[0.65rem] ${message.isMine ? "text-right" : ""}`} style={{ color: INK_2 }}>
                  <time dateTime={message.createdAt}>{time.format(new Date(message.createdAt))}</time>
                </p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      <form
        className="sticky bottom-[84px] px-3 py-2"
        style={{ background: PAPER, borderTop: "var(--rule-thin)" }}
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        {error && <p role="alert" className="mb-1.5 text-sm font-semibold" style={{ color: "var(--crimson)" }}>{error}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">{t("chat.placeholder")}</label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={t("chat.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            className="form-input max-h-32 min-h-11 flex-1 resize-none py-2.5"
          />
          <button
            type="submit"
            disabled={sending || normalizeMessage(draft) === null}
            aria-label={sending ? t("chat.sending") : t("chat.send")}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center disabled:opacity-40"
            style={{ background: RUST, border: "var(--rule-thick)" }}
          >
            <Icon name="send" size={18} color={PAPER} strokeWidth={2.2} />
          </button>
        </div>
        {remaining < 100 && <p className="mt-1 text-right text-[0.65rem]" style={{ color: INK_2 }}>{t("chat.remaining", { n: remaining })}</p>}
      </form>

      {safetyTarget && <ReportBlockSheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />}
    </div>
  );
}

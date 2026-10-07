"use client";

import { settle } from "@/lib/settle";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { initialsFor } from "@/features/profile/profile-input";
import {
  acceptFriendshipAction,
  removeFriendshipAction,
  requestFriendshipAction,
  type FriendActionState,
} from "./actions";
import type { FriendGraph, FriendshipRow } from "./friendships";
import InviteLinkCard from "./InviteLinkCard";
import { useT } from "@/lib/i18n/client";
import type { Translate } from "@/lib/i18n/translate";
import ReportBlockSheet from "@/features/safety/ReportBlockSheet";
import ChatList from "@/features/chat/ChatList";
import { openDirectChatAction } from "@/features/chat/actions";
import type { ChatSummary } from "@/features/chat/message";
import type { SafetyTarget } from "@/features/safety/reports";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PAPER_1 = "var(--paper-1)";

const initialState: FriendActionState = { status: "idle", message: "" };

function describe(row: FriendshipRow, t: Translate): string {
  const parts = [row.handle ? `@${row.handle}` : null];
  if (row.city) parts.push(row.city === "innsbruck" ? t("common.innsbruck") : t("common.salzburg"));
  if (row.ability_level) parts.push(row.ability_level === "off-piste" ? t("common.offPiste") : row.ability_level === "park" ? t("common.park") : t("common.chill"));
  return parts.filter(Boolean).join(" · ");
}

function PersonRow({
  row,
  children,
  onSafety,
}: {
  row: FriendshipRow;
  children: React.ReactNode;
  onSafety: (target: SafetyTarget) => void;
}) {
  const t = useT();
  const name = row.display_name ?? row.handle ?? t("common.rider");
  return (
    <li className="flex items-center gap-3 px-3 py-3" style={{ border: "var(--rule-thin)", background: PAPER_1 }}>
      <Avatar id={row.user_id} initials={initialsFor(row.display_name, row.handle)} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold" style={{ color: INK }}>{name}</p>
        <p className="truncate text-xs" style={{ color: INK_2 }}>{describe(row, t)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {children}
        <button
          type="button"
          onClick={() => onSafety({ userId: row.user_id, name })}
          aria-label={t("ride.reportOrBlock", { name })}
          className="flex h-11 w-8 items-center justify-center"
        >
          <Icon name="more-horizontal" size={16} color={INK_2} strokeWidth={2} />
        </button>
      </div>
    </li>
  );
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <section className="px-4 pt-5">
      <div className="section-rule">
        <h2 className="text-mono-label" style={{ color: INK }}>{label}</h2>
        <span className="text-mono-label" style={{ color: INK_2 }}>{count}</span>
      </div>
      <ul className="mt-2 space-y-2">{children}</ul>
    </section>
  );
}

/* The signed-in crew screen: requests waiting for you first, then your
   chats, then adding and managing friends. */
export default function LiveCrewScreen({ graph, chats = [] }: { graph: FriendGraph | null; chats?: ChatSummary[] | null }) {
  const t = useT();
  const router = useRouter();
  const [state, formAction, submitting] = useActionState(requestFriendshipAction, initialState);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  /* Adding friends is one tap away; it opens by itself while the crew is empty. */
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const run = async (userId: string, action: (id: string) => Promise<boolean>) => {
    setPendingId(userId);
    setRowError(null);
    const ok = await settle(action(userId), false);
    setPendingId(null);
    if (!ok) setRowError(t("common.unavailable"));
    startTransition(() => router.refresh());
  };

  const friends = graph?.friends ?? [];
  const incoming = graph?.incoming ?? [];
  const outgoing = graph?.outgoing ?? [];
  const showAdd = adding || (graph !== null && friends.length === 0);

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div>
            <h1 className="large-title" style={{ color: INK }}>{t("crew.title")}</h1>
            <p className="mt-0.5 text-xs font-semibold" style={{ color: INK_2 }}>
              {friends.length === 1 ? t("crew.friendCount") : t("crew.friendsCount", { n: friends.length })}
              {incoming.length > 0 ? t("crew.waitingForYou", { n: incoming.length }) : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            aria-expanded={showAdd}
            aria-controls="crew-add"
            className="flex min-h-11 items-center gap-1.5 px-3.5 text-sm font-semibold"
            style={{ background: "var(--rust)", color: "var(--paper-0)" }}
          >
            <Icon name="user-plus" size={15} color="var(--paper-0)" strokeWidth={2} />
            {t("crew.addFriend")}
          </button>
        </div>
      </header>

      {showAdd && (
        <div id="crew-add">
      <section className="px-4 pt-5">
        <InviteLinkCard />
      </section>

      <section className="px-4 pt-3">
        <form ref={formRef} action={formAction} className="print-card px-4 py-4" noValidate>
          <label htmlFor="crew-add-handle" className="text-mono-label block" style={{ color: RUST }}>
            {t("crew.addByHandle")}
          </label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: INK_2, fontFamily: "var(--font-mono-stack)" }}>
                @
              </span>
              <input
                id="crew-add-handle"
                name="handle"
                className="form-input"
                style={{ paddingLeft: "2rem", fontFamily: "var(--font-mono-stack)" }}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={21}
                placeholder={t("crew.handlePlaceholder")}
                aria-describedby="crew-add-status"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="card-tap text-mono-label min-h-11 px-4 disabled:opacity-50"
              style={{ background: RUST, color: "var(--paper-0)", border: "var(--rule-thin)" }}
            >
              {submitting ? "…" : t("crew.ask")}
            </button>
          </div>
          <p
            id="crew-add-status"
            role="status"
            aria-live="polite"
            className="mt-2 min-h-5 text-sm"
            style={{ color: state.status === "error" ? "var(--crimson)" : "var(--pine)" }}
          >
            {state.message}
          </p>
          <p className="text-xs leading-snug" style={{ color: INK_2 }}>
            {t("crew.noSearch")}
          </p>
        </form>
      </section>

      <section className="px-4 pt-3">
        <div className="flex items-start gap-3 px-4 py-3" style={{ background: "var(--accent-primary-subtle)", border: "var(--rule-thin)" }}>
          <Icon name="shield-check" size={16} color="var(--accent-primary)" strokeWidth={1.6} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-snug" style={{ color: INK_2 }}>
            {t("crew.visibilityNote")}
          </p>
        </div>
      </section>
        </div>
      )}

      {incoming.length > 0 && (
        <Section label={t("crew.waitingSection")} count={incoming.length}>
          {incoming.map((row) => (
            <PersonRow key={row.user_id} row={row} onSafety={setSafetyTarget}>
              <button
                type="button"
                onClick={() => run(row.user_id, acceptFriendshipAction)}
                disabled={pendingId === row.user_id}
                className="text-mono-label min-h-11 px-3 disabled:opacity-50"
                style={{ background: "var(--pine)", color: "var(--paper-0)", border: "1px solid var(--ink-0)" }}
              >
                {t("crew.accept")}
              </button>
              <button
                type="button"
                onClick={() => run(row.user_id, removeFriendshipAction)}
                disabled={pendingId === row.user_id}
                aria-label={t("common.declineName", { name: row.display_name ?? row.handle ?? t("common.rider") })}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-50"
                style={{ border: "var(--rule-thin)" }}
              >
                <Icon name="x" size={15} color={INK} strokeWidth={2} />
              </button>
            </PersonRow>
          ))}
        </Section>
      )}

      <ChatList
        chats={chats}
        friends={friends.map((row) => ({ id: row.user_id, name: row.display_name ?? row.handle ?? t("common.rider"), handle: row.handle }))}
      />

      {graph === null && (
        <p role="status" className="mx-4 mt-4 px-3 py-2.5 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>
          {t("crew.unavailable")}
        </p>
      )}

      {rowError && (
        <p role="alert" className="mx-4 mt-4 px-3 py-2.5 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>
          {rowError}
        </p>
      )}

      <Section label={t("crew.friendsSection")} count={friends.length}>
        {friends.map((row) => (
          <PersonRow key={row.user_id} row={row} onSafety={setSafetyTarget}>
            <button
              type="button"
              onClick={() => {
                setPendingId(row.user_id);
                setRowError(null);
                void settle<false | null>(openDirectChatAction(row.user_id), null).then((opened) => {
                  setPendingId(null);
                  if (opened === false) setRowError(t("chat.openFailed"));
                });
              }}
              disabled={pendingId === row.user_id}
              aria-label={t("chat.messageTo", { name: row.display_name ?? row.handle ?? t("common.rider") })}
              className="text-mono-label flex min-h-11 items-center gap-1 px-2.5 disabled:opacity-50"
              style={{ background: "var(--rust)", color: "var(--on-accent)" }}
            >
              <Icon name="message-circle" size={14} color="var(--paper-0)" strokeWidth={2} />
              {t("chat.message")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("crew.confirmRemove", { name: row.display_name ?? row.handle ?? t("crew.thisFriend") }))) {
                  void run(row.user_id, removeFriendshipAction);
                }
              }}
              disabled={pendingId === row.user_id}
              aria-label={t("crew.removeName", { name: row.display_name ?? row.handle ?? t("common.rider") })}
              className="flex h-11 w-11 items-center justify-center disabled:opacity-50"
            >
              <Icon name="x" size={15} color={INK_2} strokeWidth={2} />
            </button>
          </PersonRow>
        ))}
        {friends.length === 0 && graph !== null && (
          <li className="px-3 py-4 text-sm" style={{ color: INK_2, border: "1px dashed var(--paper-3)" }}>
            {t("crew.noFriends")}
          </li>
        )}
      </Section>

      {outgoing.length > 0 && (
        <Section label={t("crew.askedSection")} count={outgoing.length}>
          {outgoing.map((row) => (
            <PersonRow key={row.user_id} row={row} onSafety={setSafetyTarget}>
              <button
                type="button"
                onClick={() => run(row.user_id, removeFriendshipAction)}
                disabled={pendingId === row.user_id}
                className="text-mono-label min-h-11 px-3 disabled:opacity-50"
                style={{ border: "var(--rule-thin)", color: INK }}
              >
                {t("crew.withdraw")}
              </button>
            </PersonRow>
          ))}
        </Section>
      )}

      <div className="pb-8" />
      {safetyTarget && <ReportBlockSheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />}
    </>
  );
}

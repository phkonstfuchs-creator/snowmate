"use client";

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

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PAPER_1 = "var(--paper-1)";

const initialState: FriendActionState = { status: "idle", message: "" };

function describe(row: FriendshipRow): string {
  const parts = [row.handle ? `@${row.handle}` : null];
  if (row.city) parts.push(row.city === "innsbruck" ? "Innsbruck" : "Salzburg");
  if (row.ability_level) parts.push(row.ability_level === "off-piste" ? "Off-piste" : row.ability_level === "park" ? "Park" : "Chill");
  return parts.filter(Boolean).join(" · ");
}

function PersonRow({
  row,
  children,
}: {
  row: FriendshipRow;
  children: React.ReactNode;
}) {
  const name = row.display_name ?? row.handle ?? "Rider";
  return (
    <li className="flex items-center gap-3 px-3 py-3" style={{ border: "var(--rule-thin)", background: PAPER_1 }}>
      <Avatar id={row.user_id} initials={initialsFor(row.display_name, row.handle)} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold" style={{ color: INK }}>{name}</p>
        <p className="truncate text-xs" style={{ color: INK_2 }}>{describe(row)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">{children}</div>
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

/* The signed-in crew screen. Squads and chats have no backend yet, so
   this version only carries what is real: the friend graph. */
export default function LiveCrewScreen({ graph }: { graph: FriendGraph | null }) {
  const router = useRouter();
  const [state, formAction, submitting] = useActionState(requestFriendshipAction, initialState);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const run = async (userId: string, action: (id: string) => Promise<boolean>) => {
    setPendingId(userId);
    setRowError(null);
    const ok = await action(userId);
    setPendingId(null);
    if (!ok) setRowError("That did not work. Try again shortly.");
    startTransition(() => router.refresh());
  };

  const friends = graph?.friends ?? [];
  const incoming = graph?.incoming ?? [];
  const outgoing = graph?.outgoing ?? [];

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>Crew</h1>
          <p className="mt-0.5 text-xs font-semibold" style={{ color: INK_2 }}>
            {friends.length} {friends.length === 1 ? "friend" : "friends"}
            {incoming.length > 0 ? ` · ${incoming.length} waiting for you` : ""}
          </p>
        </div>
      </header>

      <section className="px-4 pt-4">
        <form ref={formRef} action={formAction} className="print-card px-4 py-4" noValidate>
          <label htmlFor="crew-add-handle" className="text-mono-label block" style={{ color: RUST }}>
            Add a friend by handle
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
                placeholder="their_handle"
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
              {submitting ? "…" : "Ask"}
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
            There is no search on purpose. Ask for their handle in person or in
            your group chat.
          </p>
        </form>
      </section>

      {graph === null && (
        <p role="status" className="mx-4 mt-4 px-3 py-2.5 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>
          Your crew could not be loaded. Try again shortly.
        </p>
      )}

      {rowError && (
        <p role="alert" className="mx-4 mt-4 px-3 py-2.5 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>
          {rowError}
        </p>
      )}

      {incoming.length > 0 && (
        <Section label="Waiting for you" count={incoming.length}>
          {incoming.map((row) => (
            <PersonRow key={row.user_id} row={row}>
              <button
                type="button"
                onClick={() => run(row.user_id, acceptFriendshipAction)}
                disabled={pendingId === row.user_id}
                className="text-mono-label min-h-11 px-3 disabled:opacity-50"
                style={{ background: "var(--pine)", color: "var(--paper-0)", border: "1px solid var(--ink-0)" }}
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => run(row.user_id, removeFriendshipAction)}
                disabled={pendingId === row.user_id}
                aria-label={`Decline ${row.display_name ?? row.handle ?? "request"}`}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-50"
                style={{ border: "var(--rule-thin)" }}
              >
                <Icon name="x" size={15} color={INK} strokeWidth={2} />
              </button>
            </PersonRow>
          ))}
        </Section>
      )}

      <Section label="Friends" count={friends.length}>
        {friends.map((row) => (
          <PersonRow key={row.user_id} row={row}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Remove ${row.display_name ?? row.handle ?? "this friend"} from your crew?`)) {
                  void run(row.user_id, removeFriendshipAction);
                }
              }}
              disabled={pendingId === row.user_id}
              aria-label={`Remove ${row.display_name ?? row.handle ?? "friend"}`}
              className="flex h-11 w-11 items-center justify-center disabled:opacity-50"
            >
              <Icon name="x" size={15} color={INK_2} strokeWidth={2} />
            </button>
          </PersonRow>
        ))}
        {friends.length === 0 && graph !== null && (
          <li className="px-3 py-4 text-sm" style={{ color: INK_2, border: "1px dashed var(--paper-3)" }}>
            No friends yet. Add someone above, or join an open event to meet people.
          </li>
        )}
      </Section>

      {outgoing.length > 0 && (
        <Section label="Asked, waiting" count={outgoing.length}>
          {outgoing.map((row) => (
            <PersonRow key={row.user_id} row={row}>
              <button
                type="button"
                onClick={() => run(row.user_id, removeFriendshipAction)}
                disabled={pendingId === row.user_id}
                className="text-mono-label min-h-11 px-3 disabled:opacity-50"
                style={{ border: "var(--rule-thin)", color: INK }}
              >
                Withdraw
              </button>
            </PersonRow>
          ))}
        </Section>
      )}

      <section className="px-4 pt-5 pb-8">
        <div className="flex items-start gap-3 px-4 py-3" style={{ background: "var(--accent-primary-subtle)", border: "var(--rule-thin)" }}>
          <Icon name="shield-check" size={16} color="var(--accent-primary)" strokeWidth={1.6} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-snug" style={{ color: INK_2 }}>
            Friends see your rides with the meeting point. Their friends see
            the resort only. Under 18, only confirmed friends see your rides.
          </p>
        </div>
      </section>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBasePath } from "@/hooks/useBasePath";
import type { User } from "@/lib/types";
import { MOCK_USERS, ME, getUserById } from "@/lib/data";
import {
  countMutualFriends,
  getRequestState,
  resolveIncomingRequest,
  searchPeople,
  suggestPeople,
  toggleOutgoingRequest,
  type RequestLedger,
} from "@/features/crew/people-search";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";

const PAPER_1 = "var(--paper-1)";
const INK = "var(--ink-0)";
const INK_1 = "var(--ink-1)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PINE = "var(--pine)";

type Mode = "find" | "requests";

/* Whoever sent the request is waiting, which is why these are two
   separate views rather than one list with two kinds of button.
   u9 is a minor: that is exactly where the U18 marker has to show,
   because it changes the decision. */
const INCOMING_IDS = ["u6", "u9", "u8"];

function PersonRow({
  user,
  meta,
  action,
}: {
  user: User;
  meta: string;
  action: React.ReactNode;
}) {
  return (
    <li
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border-hairline)" }}
    >
      <Avatar
        id={user.id}
        initials={user.avatar}
        size={42}
        verified={user.accountType === "verified"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[0.9375rem] font-semibold" style={{ color: INK }}>
            {user.name}
          </span>
          {user.isMinor && (
            <span
              className="text-mono-label flex-shrink-0 px-1.5"
              style={{ background: "var(--paper-2)", color: INK_1 }}
            >
              U18
            </span>
          )}
        </div>
        <p className="truncate text-sm" style={{ color: INK_2 }}>
          {meta}
        </p>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </li>
  );
}

/* Meta kept short on purpose: next to the avatar and button the
   line has roughly 180px, anything longer ends in an ellipsis. */
function personMeta(user: User): string {
  const mutual = countMutualFriends(user, ME);
  return mutual > 0
    ? `@${user.handle} · ${mutual} mutual`
    : `@${user.handle} · Level ${user.level}`;
}

function PeopleSection({
  title,
  count,
  users,
  ledger,
  onRequest,
}: {
  title: string;
  count?: number;
  users: readonly User[];
  ledger: RequestLedger;
  onRequest: (userId: string) => void;
}) {
  return (
    <section className="pt-5">
      <div className="px-4">
        <div className="section-rule">
          <h2 className="text-mono-label" style={{ color: INK }}>{title}</h2>
          {count !== undefined && (
            <span className="text-mono-label" style={{ color: INK_2 }}>{count}</span>
          )}
        </div>
      </div>
      <ul style={{ borderTop: "var(--rule-thin)" }}>
        {users.map((user) => {
          const sent = getRequestState(ledger, user.id) === "sent";
          return (
            <PersonRow
              key={user.id}
              user={user}
              meta={personMeta(user)}
              action={
                <button
                  onClick={() => onRequest(user.id)}
                  aria-label={sent ? `Withdraw request to ${user.name}` : `Request ${user.name}`}
                  className="text-mono-label card-tap px-3 py-2"
                  style={
                    sent
                      ? { background: PAPER_1, color: INK_1, border: "var(--rule-thin)" }
                      : { background: RUST, color: "var(--paper-0)", border: "var(--rule-thin)" }
                  }
                >
                  {sent ? "Sent" : "Request"}
                </button>
              }
            />
          );
        })}
      </ul>
    </section>
  );
}

export default function PeopleScreen() {
  const basePath = useBasePath();
  const [mode, setMode] = useState<Mode>("find");
  const [query, setQuery] = useState("");
  const [ledger, setLedger] = useState<RequestLedger>({});

  const results = useMemo(() => searchPeople(MOCK_USERS, query, ME), [query]);
  const suggestions = useMemo(() => suggestPeople(MOCK_USERS, ME), []);
  /* No mutual friends means no suggestion, otherwise it would be a
     list of strangers. The remaining people still appear below, so
     the screen does not dead-end. */
  const others = useMemo(() => {
    const suggested = new Set(suggestions.map((entry) => entry.user.id));
    return searchPeople(MOCK_USERS, "", ME).filter(
      (user) => !suggested.has(user.id),
    );
  }, [suggestions]);
  const incoming = useMemo(
    () =>
      INCOMING_IDS.map(getUserById).filter(
        (user): user is User => user !== undefined,
      ),
    [],
  );

  const openRequests = incoming.filter(
    (user) => getRequestState(ledger, user.id) === "none",
  ).length;
  const isSearching = query.trim().length > 0;

  const sendOrWithdraw = (userId: string) =>
    setLedger((previous) => toggleOutgoingRequest(previous, userId));

  const decide = (userId: string, decision: "accepted" | "declined") =>
    setLedger((previous) => resolveIncomingRequest(previous, userId, decision));

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <Link
            href={`${basePath}/crew`}
            aria-label="Back to crew"
            className="-ml-2 flex h-11 w-11 items-center justify-center"
          >
            <Icon name="arrow-left" size={18} color={INK} strokeWidth={2} />
          </Link>
          <div>
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>
              People
            </h1>
            <p className="mt-0.5 text-xs font-semibold" style={{ color: INK_2 }}>
              {ME.friendIds.length} in your crew
              {openRequests > 0
                ? ` · ${openRequests} open ${openRequests === 1 ? "request" : "requests"}`
                : ""}
            </p>
          </div>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[
              { value: "find", label: "Find" },
              { value: "requests", label: openRequests > 0 ? `Requests (${openRequests})` : "Requests" },
            ]}
            value={mode}
            onChange={setMode}
            ariaLabel="View"
          />
        </div>
      </header>

      {mode === "find" && (
        <div className="pb-6">
          <div className="px-4 pt-4">
            <label htmlFor="people-search" className="sr-only">
              Search by name or handle
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Icon name="search" size={16} color={INK_2} strokeWidth={1.9} />
              </span>
              <input
                id="people-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or @handle"
                className="form-input"
                style={{ paddingLeft: 38 }}
                autoComplete="off"
              />
            </div>
          </div>

          {!isSearching && suggestions.length > 0 && (
            <PeopleSection
              title="Mutual friends"
              users={suggestions.map((entry) => entry.user)}
              ledger={ledger}
              onRequest={sendOrWithdraw}
            />
          )}

          {!isSearching && others.length > 0 && (
            <PeopleSection
              title="More in your region"
              users={others}
              ledger={ledger}
              onRequest={sendOrWithdraw}
            />
          )}

          {isSearching && (
            results.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <Icon name="search" size={26} color={INK_2} strokeWidth={1.5} />
                <div>
                  <p className="font-semibold" style={{ color: INK }}>
                    No one found
                  </p>
                  <p className="mt-1 text-sm" style={{ color: INK_2 }}>
                    Check the spelling, or invite them with a link.
                  </p>
                </div>
              </div>
            ) : (
              <PeopleSection
                title="Matches"
                count={results.length}
                users={results}
                ledger={ledger}
                onRequest={sendOrWithdraw}
              />
            )
          )}

          <div className="px-4 pt-6">
            <button
              className="card-tap flex w-full items-center justify-center gap-2 py-3.5"
              style={{ border: "var(--rule-thin)", background: PAPER_1, color: INK }}
            >
              <Icon name="share" size={15} strokeWidth={1.9} />
              <span className="text-mono-label">Share invite link · +200 XP</span>
            </button>
          </div>
        </div>
      )}

      {mode === "requests" && (
        <div className="pb-6">
          {incoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Icon name="user-check" size={28} color={INK_2} strokeWidth={1.5} />
              <p className="font-semibold" style={{ color: INK }}>
                No open requests
              </p>
            </div>
          ) : (
            <ul className="pt-4" style={{ borderTop: "var(--rule-thin)" }}>
              {incoming.map((user) => {
                const requestState = getRequestState(ledger, user.id);
                const mutual = countMutualFriends(user, ME);

                if (requestState === "accepted" || requestState === "declined") {
                  return (
                    <PersonRow
                      key={user.id}
                      user={user}
                      meta={`@${user.handle} · Level ${user.level}`}
                      action={
                        <span
                          className="text-mono-label px-2 py-1"
                          style={{
                            color: requestState === "accepted" ? PINE : INK_2,
                            background: PAPER_1,
                          }}
                        >
                          {requestState === "accepted" ? "In your crew" : "Declined"}
                        </span>
                      }
                    />
                  );
                }

                return (
                  <li
                    key={user.id}
                    className="px-4 py-4"
                    style={{ borderBottom: "1px solid var(--border-hairline)" }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        id={user.id}
                        initials={user.avatar}
                        size={44}
                        verified={user.accountType === "verified"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[0.9375rem] font-semibold" style={{ color: INK }}>
                            {user.name}
                          </span>
                          {user.isMinor && (
                            <span
                              className="text-mono-label flex-shrink-0 px-1.5"
                              style={{ background: "var(--paper-2)", color: INK_1 }}
                            >
                              U18
                            </span>
                          )}
                        </div>
                        <p className="truncate text-sm" style={{ color: INK_2 }}>
                          @{user.handle} · {mutual > 0 ? `${mutual} mutual` : "no mutual friends"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => decide(user.id, "declined")}
                        className="card-tap flex-1 py-2.5"
                        style={{ border: "var(--rule-thin)", color: INK_1, background: "transparent" }}
                      >
                        <span className="text-mono-label">Decline</span>
                      </button>
                      <button
                        onClick={() => decide(user.id, "accepted")}
                        className="card-tap flex-1 py-2.5"
                        style={{ background: PINE, color: "var(--paper-0)", border: "var(--rule-thin)" }}
                      >
                        <span className="text-mono-label">Accept</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

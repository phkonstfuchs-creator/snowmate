"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CarpoolPost, CarpoolRole, City } from "@/lib/types";
import { CARPOOL_POSTS, RESORT_STATUS, getUserById, getUsersByIds } from "@/lib/data";
import ResortScene from "@/components/ResortScene";
import PenguinMascot from "@/components/PenguinMascot";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";
import type { LiveCarpool, RequestStatus } from "./live-carpool";
import type { CarpoolFormInput } from "./carpool-input";
import {
  cancelCarpoolAction,
  createCarpoolAction,
  requestCarpoolAction,
  respondCarpoolRequestAction,
  withdrawCarpoolRequestAction,
  type CarpoolActionResult,
} from "./actions";
import { toIsoDay } from "@/features/rides/live-ride";

const D = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER = "var(--border-subtle)";
const MUTED = "var(--text-tertiary)";
const INK = "var(--text-primary)";
const BRAND = "var(--accent-primary)";

function OfferModal({
  city,
  onClose,
  onSubmit,
}: {
  city: City;
  onClose: () => void;
  onSubmit: (input: CarpoolFormInput) => Promise<CarpoolActionResult>;
}) {
  useScrollLock();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [role, setRole] = useState<CarpoolRole>("driver");
  const [resort, setResort] = useState("");
  const [rideDate, setRideDate] = useState(() => toIsoDay(new Date()));
  const [departurePoint, setDeparturePoint] = useState("");
  const [departureTime, setDepartureTime] = useState("08:00");
  const [seats, setSeats] = useState(3);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resorts = RESORT_STATUS.filter((r) => r.city === city).map((r) => r.name);
  const canSubmit = resort !== "" && departurePoint.trim().length >= 2 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const result = await onSubmit({ role, resort, city, rideDate, departurePoint, departureTime, seats, note });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    dismiss();
  };

  const label = "text-xs font-bold mb-1.5 block";

  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-label="Offer a ride" tabIndex={-1} style={{ maxHeight: "92dvh", overflowY: "auto", paddingBottom: "max(env(safe-area-inset-bottom,16px),28px)" }}>
        <div className="flex justify-center pt-3 mb-4">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="font-display" style={{ color: INK, fontSize: 20, fontWeight: 800 }}>
            {role === "driver" ? "Offer a ride" : "Ask for a seat"}
          </h2>
          <button type="button" onClick={dismiss} aria-label="Close dialog" className="flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color={MUTED} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 space-y-3 mb-5">
          {error && (
            <p role="alert" className="px-3 py-2 text-sm" style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}>
              {error}
            </p>
          )}
          <SegmentedControl
            options={[{ value: "driver", label: "I am driving" }, { value: "rider", label: "I need a seat" }]}
            value={role}
            onChange={setRole}
            ariaLabel="Carpool role"
          />
          <div>
            <label htmlFor="carpool-to" className={label} style={{ color: MUTED }}>Destination</label>
            <select id="carpool-to" className="form-input" value={resort} onChange={(e) => setResort(e.target.value)}>
              <option value="">Choose a resort …</option>
              {resorts.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="carpool-from" className={label} style={{ color: MUTED }}>Pickup spot</label>
            <input id="carpool-from" className="form-input" placeholder="e.g. Innsbruck Hbf" maxLength={120} value={departurePoint} onChange={(e) => setDeparturePoint(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="carpool-date" className={label} style={{ color: MUTED }}>Day</label>
              <input id="carpool-date" type="date" min={toIsoDay(new Date())} className="form-input" value={rideDate} onChange={(e) => setRideDate(e.target.value)} />
            </div>
            <div className="w-36">
              <label htmlFor="carpool-time" className={label} style={{ color: MUTED }}>Time</label>
              <input id="carpool-time" type="time" className="form-input" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="carpool-seats" className={label} style={{ color: MUTED }}>
              {role === "driver" ? "Free seats" : "Seats needed"}
            </label>
            <select id="carpool-seats" className="form-input" value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="carpool-note" className={label} style={{ color: MUTED }}>Note (optional)</label>
            <textarea id="carpool-note" rows={2} maxLength={280} className="form-input resize-none" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="text-xs leading-snug" style={{ color: MUTED }}>
            Friends see the pickup spot. Friends of friends see the trip and
            can ask; they get the pickup spot once you confirm them.
          </p>
        </div>

        <div className="px-5">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="card-tap w-full py-4 rounded-none font-black text-base disabled:opacity-40"
            style={{ background: BRAND, color: D }}
          >
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </>
  );
}

/* Fixture post → the database shape, with the prototype's local request
   state applied, so both paths share the screen below. */
function fixtureToLiveCarpool(post: CarpoolPost, myRequest: RequestStatus | null): LiveCarpool | null {
  const author = getUserById(post.authorId);
  if (!author) return null;
  return {
    post,
    dateLabel: "Today",
    author,
    isAuthor: false,
    myRequest,
    departureLocked: false,
    requests: getUsersByIds(post.riders).map((user) => ({ user, status: "accepted" as const })),
  };
}

export interface LiveCarpoolBoard {
  /* null when the backend could not be reached */
  carpools: LiveCarpool[] | null;
  defaultCity: City;
}

function RequestButton({
  pool,
  pending,
  onClick,
}: {
  pool: LiveCarpool;
  pending: boolean;
  onClick: () => void;
}) {
  const isDriver = pool.post.role === "driver";
  const full = isDriver && pool.post.availableSeats === 0;
  const label =
    pool.myRequest === "accepted"
      ? "Confirmed · tap to leave"
      : pool.myRequest === "pending"
        ? "Asked · tap to withdraw"
        : isDriver
          ? "Request seat"
          : "Offer a ride";

  return (
    <button
      onClick={onClick}
      disabled={pending || (full && pool.myRequest === null)}
      className="w-full min-h-11 rounded-none text-sm font-black transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
      style={
        pool.myRequest
          ? { background: "var(--accent-primary-subtle)", color: BRAND }
          : full
            ? { background: "var(--bg-surface-2)", color: MUTED }
            : isDriver
              ? { background: BRAND, color: D }
              : { border: `2px solid ${BRAND}`, color: BRAND, background: "transparent" }
      }
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

function AuthorPanel({
  pool,
  pending,
  onRespond,
  onCancel,
}: {
  pool: LiveCarpool;
  pending: boolean;
  onRespond: (userId: string, accept: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-mono-label" style={{ color: MUTED }}>
        {pool.requests.length === 0 ? "Nobody asked yet" : `${pool.requests.length} asked`}
      </p>
      {pool.requests.map(({ user, status }) => (
        <div key={user.id} className="flex items-center gap-2">
          <Avatar id={user.id} initials={user.avatar} size={26} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color: INK }}>{user.name}</span>
          {status === "accepted" ? (
            <span className="text-mono-label" style={{ color: "var(--status-success)" }}>Confirmed</span>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRespond(user.id, true)}
                className="text-mono-label min-h-11 px-3 disabled:opacity-50"
                style={{ background: "var(--pine)", color: "var(--paper-0)" }}
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRespond(user.id, false)}
                aria-label={`Decline ${user.name}`}
                className="flex h-11 w-11 items-center justify-center disabled:opacity-50"
                style={{ border: `1px solid ${BORDER}` }}
              >
                <Icon name="x" size={14} color={MUTED} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className="mt-1 w-full min-h-11 text-sm font-black disabled:opacity-50"
        style={{ color: "var(--crimson)", border: "1px solid var(--crimson)" }}
      >
        Remove post
      </button>
    </div>
  );
}

/* `live` is undefined in the /demo prototype, which runs on fixtures. */
export default function CarpoolScreen({ live }: { live?: LiveCarpoolBoard }) {
  const router = useRouter();
  const [city, setCity] = useState<City>(live?.defaultCity ?? "innsbruck");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [demoRequested, setDemoRequested] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isLive = live !== undefined;
  const unavailable = isLive && live.carpools === null;

  const pools = useMemo(
    () =>
      (live
        ? live.carpools ?? []
        : CARPOOL_POSTS.map((post) => fixtureToLiveCarpool(post, demoRequested.has(post.id) ? "pending" : null)).filter(
            (pool): pool is LiveCarpool => pool !== null,
          )
      ).filter((pool) => pool.post.city === city),
    [live, demoRequested, city],
  );
  const drivers = pools.filter((p) => p.post.role === "driver");
  const riders = pools.filter((p) => p.post.role === "rider");

  const runLive = async (id: string, action: () => Promise<CarpoolActionResult>) => {
    setPendingId(id);
    setNotice(null);
    const result = await action();
    setPendingId(null);
    if (!result.ok) setNotice(result.message);
    startTransition(() => router.refresh());
  };

  const toggleRequest = (pool: LiveCarpool) => {
    if (!isLive) {
      setDemoRequested((previous) => {
        const next = new Set(previous);
        if (next.has(pool.post.id)) next.delete(pool.post.id);
        else next.add(pool.post.id);
        return next;
      });
      return;
    }
    void runLive(pool.post.id, () =>
      pool.myRequest ? withdrawCarpoolRequestAction(pool.post.id) : requestCarpoolAction(pool.post.id),
    );
  };

  const respond = (pool: LiveCarpool, userId: string, accept: boolean) =>
    void runLive(pool.post.id, () => respondCarpoolRequestAction(pool.post.id, userId, accept));

  const cancel = (pool: LiveCarpool) => {
    if (!window.confirm("Remove this carpool post?")) return;
    void runLive(pool.post.id, () => cancelCarpoolAction(pool.post.id));
  };

  const submitOffer = async (input: CarpoolFormInput): Promise<CarpoolActionResult> => {
    if (!isLive) return { ok: true, message: "Demo: nothing is saved." };
    const result = await createCarpoolAction(input);
    if (result.ok) startTransition(() => router.refresh());
    return result;
  };

  const actionArea = (pool: LiveCarpool) =>
    pool.isAuthor ? (
      <AuthorPanel
        pool={pool}
        pending={pendingId === pool.post.id}
        onRespond={(userId, accept) => respond(pool, userId, accept)}
        onCancel={() => cancel(pool)}
      />
    ) : (
      <RequestButton pool={pool} pending={pendingId === pool.post.id} onClick={() => toggleRequest(pool)} />
    );

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>Carpool</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>Get a seat or offer one</p>
          </div>
          <button
            onClick={() => setShowOfferModal(true)}
            className="card-tap text-mono-label flex min-h-11 items-center gap-1.5 px-3"
            style={{ background: BRAND, color: D, border: "var(--rule-thin)", boxShadow: "var(--shadow-print)" }}
          >
            <Icon name="plus" size={13} strokeWidth={2.6} />
            Post
          </button>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]}
            value={city}
            onChange={setCity}
            ariaLabel="Region"
          />
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-6">
        {(notice || unavailable) && (
          <div role="status" className="flex items-start justify-between gap-3 px-3 py-2.5" style={{ border: "1px solid var(--crimson)", background: "var(--paper-1)" }}>
            <p className="text-sm" style={{ color: "var(--crimson)" }}>
              {notice ?? "Carpools could not be loaded. Try again shortly."}
            </p>
            {notice && (
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="-my-2 -mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center">
                <Icon name="x" size={14} color="var(--crimson)" strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* Drivers */}
        {drivers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-success)" }} />
              <h2 className="font-black text-xs uppercase" style={{ color: "var(--status-success)" }}>
                Seats open · {drivers.length}
              </h2>
            </div>
            <div className="space-y-3">
              {drivers.map((pool, i) => {
                const { post, author } = pool;
                return (
                  <div
                    key={post.id}
                    className="rounded-none overflow-hidden anim-fade-up"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, animationDelay: `${i * 55}ms` }}
                  >
                    {/* Mini resort scene strip */}
                    <div className="relative h-16 overflow-hidden" style={{ borderBottom: "var(--rule-thin)" }}>
                      <ResortScene name={post.resort} className="absolute inset-0 w-full h-full" />
                      <span
                        className="text-mono-label absolute left-0 top-0 px-2 py-1"
                        style={{ background: "var(--ochre)", color: "var(--ink-0)" }}
                      >
                        {pool.dateLabel}
                      </span>
                      <span
                        className="text-mono-label absolute right-0 top-0 flex items-center gap-1 px-2 py-1"
                        style={{ background: "var(--ink-0)", color: "var(--paper-0)" }}
                        aria-label={`${post.availableSeats} seats free`}
                      >
                        {post.availableSeats}
                        <Icon name="users" size={11} strokeWidth={2} />
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={{ borderBottom: "1px solid var(--border-hairline)" }}
                    >
                      <Avatar id={author.id} initials={author.avatar} size={34} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold" style={{ color: INK }}>
                          {pool.isAuthor ? "You" : author.name}
                        </p>
                        <p className="text-mono-label" style={{ color: MUTED }}>{post.resort}</p>
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Icon name={pool.departureLocked ? "lock" : "map-pin"} size={12} color={pool.departureLocked ? MUTED : BRAND} strokeWidth={2} />
                          <span className="truncate text-sm font-bold" style={{ color: pool.departureLocked ? MUTED : INK }}>{post.departurePoint}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon name="clock" size={12} color={MUTED} strokeWidth={2} />
                          <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{post.departureTime}</span>
                        </div>
                      </div>
                      {post.note && (
                        <p className="text-xs mb-3 font-medium" style={{ color: MUTED }}>{post.note}</p>
                      )}
                      {actionArea(pool)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Riders seeking */}
        {riders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--rust)" }} />
              <h2 className="font-black text-xs uppercase" style={{ color: "var(--rust)" }}>
                Looking for a seat · {riders.length}
              </h2>
            </div>
            <div className="space-y-2">
              {riders.map((pool, i) => {
                const { post, author } = pool;
                return (
                  <div
                    key={post.id}
                    className="rounded-none p-4 anim-fade-up"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, animationDelay: `${i * 55}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar id={author.id} initials={author.avatar} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm" style={{ color: INK }}>{pool.isAuthor ? "You" : author.name}</span>
                          <span className="text-mono-label px-2 py-0.5" style={{ background: "var(--accent-warm-subtle)", color: "var(--rust-ink)" }}>
                            Needs {post.totalSeats > 1 ? `${post.totalSeats} seats` : "a seat"}
                          </span>
                        </div>
                        <p className="text-xs font-semibold mt-1" style={{ color: MUTED }}>
                          {post.departurePoint} → {post.resort} · {pool.dateLabel} {post.departureTime}
                        </p>
                        {post.note && <p className="text-xs mt-1.5 font-medium" style={{ color: MUTED }}>{post.note}</p>}
                        <div className="mt-3">{actionArea(pool)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {drivers.length === 0 && riders.length === 0 && !unavailable && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <PenguinMascot size={64} />
            <div>
              <p className="font-black text-lg" style={{ color: INK }}>No carpools yet</p>
              <p className="text-sm font-medium mt-1" style={{ color: MUTED }}>Offer a ride or ask for a seat.</p>
            </div>
          </div>
        )}
      </div>

      {showOfferModal && <OfferModal city={city} onClose={() => setShowOfferModal(false)} onSubmit={submitOffer} />}
    </>
  );
}

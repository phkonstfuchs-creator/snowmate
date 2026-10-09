"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { readGoStatus, saveGoInterest, withdrawGoInterest } from "./actions";
import type { GoStatusResult } from "./go-status";
interface Props {
  rideId: string;
  totalSpots: number;
  isJoined: boolean;
  isPending: boolean;
  onGate: (blocked: boolean) => void;
}
export default function GoInterest({
  rideId,
  totalSpots,
  isJoined,
  isPending,
  onGate,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [result, setResult] = useState<GoStatusResult | null>(null);
  const [minimum, setMinimum] = useState(2);
  const [seat, setSeat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      const next = await readGoStatus(rideId);
      if (request === generation.current) setResult(next);
    } catch {
      if (request === generation.current) setResult({ status: "unavailable" });
    }
  }, [rideId]);
  useEffect(() => {
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    const timer = setInterval(() => {
      if (!inFlight.current) void refresh();
    }, 20000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);
  const wish =
    result?.status === "ok" &&
    result.wish &&
    !["withdrawn", "expired"].includes(result.wish.status)
      ? result.wish
      : null;
  const blocked =
    !isJoined &&
    !isPending &&
    (busy ||
      !result ||
      result.status === "unavailable" ||
      (!!wish && !wish.ready));
  useEffect(() => {
    onGate(blocked);
  }, [onGate, blocked]);
  const change = async (withdraw: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setNotice(null);
    onGate(!isJoined && !isPending);
    try {
      const answer = await (withdraw
        ? withdrawGoInterest(rideId)
        : saveGoInterest(rideId, minimum, seat));
      setNotice(answer.message);
      await refresh();
      router.refresh();
    } catch {
      setNotice(t("common.offline"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      aria-label={t("go.title")}
      className="mx-5 my-4 space-y-3 border p-4"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <h3 className="font-bold">{t("go.title")}</h3>
      <p className="text-sm">{t("go.explanation")}</p>
      {!result ? (
        <p role="status">{t("go.checking")}</p>
      ) : result.status === "unavailable" ? (
        <p role="alert">{t("go.unavailable")}</p>
      ) : wish ? (
        <>
          <p>
            {t("go.group", { n: wish.confirmedGroup, min: wish.minimumGroup })}
          </p>
          {wish.needsCarpool && (
            <p>
              {t(wish.hasConfirmedCarpool ? "go.seatReady" : "go.missingSeat")}
            </p>
          )}
          <p role={isJoined && !wish.ready ? "alert" : "status"}>
            {t(
              isJoined && !wish.ready
                ? "go.lost"
                : isJoined
                  ? "go.confirmed"
                  : isPending
                    ? "go.pending"
                    : wish.ready
                      ? "go.ready"
                      : "go.waiting",
            )}
          </p>
          {!isJoined && (
            <button
              type="button"
              className="min-h-11 font-semibold underline"
              disabled={busy}
              onClick={() => void change(true)}
            >
              {t("go.withdraw")}
            </button>
          )}
        </>
      ) : !isJoined && !isPending ? (
        <>
          <label className="block">
            {t("go.minimum")}
            <select
              aria-label={t("go.minimum")}
              className="block min-h-11 w-full border"
              value={minimum}
              onChange={(event) => setMinimum(Number(event.target.value))}
              disabled={busy}
            >
              {Array.from(
                { length: Math.min(11, Math.max(0, totalSpots)) },
                (_, i) => i + 2,
              ).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={seat}
              disabled={busy}
              onChange={(event) => setSeat(event.target.checked)}
            />
            {t("go.seat")}
          </label>
          <button
            type="button"
            className="min-h-11 font-semibold underline"
            disabled={busy || totalSpots < 1}
            onClick={() => void change(false)}
          >
            {t("go.save")}
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="block min-h-11 text-sm underline"
        disabled={busy}
        onClick={() => void refresh()}
      >
        {t("go.retry")}
      </button>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}

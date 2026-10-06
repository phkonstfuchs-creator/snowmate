"use client";

import { useCallback, useEffect, useState } from "react";
import { friendLiftMeetupsAction, myLiftMeetupAction, startLiftMeetupAction, stopLiftMeetupAction } from "./actions";
import type { LiftMeetup, StartResult } from "./meetup";

export function useLiftMeetups(initialMine: LiftMeetup | null, initialFriends: LiftMeetup[] | null) {
  const [mine, setMine] = useState(initialMine);
  const [friends, setFriends] = useState(initialFriends);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StartResult | null>(null);

  const refresh = useCallback(async () => {
    const nextMine = await myLiftMeetupAction();
    const nextFriends = await friendLiftMeetupsAction();
    setMine(nextMine);
    setFriends(nextFriends);
  }, []);

  const start = useCallback(async (resort: string, liftId: string) => {
    setBusy(true);
    setResult(null);
    try {
      const next = await startLiftMeetupAction(resort, liftId);
      setResult(next);
      if (next === "sharing") await refresh();
      return next === "sharing";
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const stop = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await stopLiftMeetupAction();
      if (ok) setMine(null);
      else setResult("unavailable");
      return ok;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!mine) return;
    const remaining = new Date(mine.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => setMine(null), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [mine]);

  useEffect(() => {
    if (!friends?.length) return;
    const nextExpiry = Math.min(...friends.map((friend) => new Date(friend.expiresAt).getTime()));
    const timer = setTimeout(() => {
      setFriends((current) => current?.filter((friend) => new Date(friend.expiresAt).getTime() > Date.now()) ?? null);
    }, Math.max(0, nextExpiry - Date.now()));
    return () => clearTimeout(timer);
  }, [friends]);

  return { mine, friends, busy, result, start, stop };
}

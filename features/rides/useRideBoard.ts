"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RidePost } from "@/lib/types";
import { ME, getUserById, getUsersByIds } from "@/lib/data";
import { toggleSetValue } from "@/lib/collections";
import { toVisibleRide } from "./visibility";
import { LOCKED_MEET_POINT_LABEL, type LiveRide } from "./live-ride";
import {
  cancelRideAction,
  createRideAction,
  joinRideAction,
  leaveRideAction,
  type RideActionResult,
} from "./actions";
import type { RideFormInput } from "./ride-input";

/* Turns a fixture post into the same shape the database delivers, with
   the prototype's local join state applied. That way the screens have
   one code path, and the demo exercises the same lock rules. */
export function fixtureToLiveRide(post: RidePost, isJoined: boolean): LiveRide | null {
  const host = getUserById(post.authorId);
  if (!host) return null;

  const participants = getUsersByIds(post.joinedUserIds);
  if (isJoined && !participants.some((user) => user.id === ME.id)) {
    participants.push(ME);
  }

  const view = toVisibleRide(post, { viewer: ME, author: host, isJoined, friendIds: ME.friendIds });

  return {
    post: {
      ...post,
      takenSpots: post.takenSpots + (isJoined ? 1 : 0),
      joinedUserIds: participants.map((user) => user.id),
      meetPoint: view.meetPoint ?? LOCKED_MEET_POINT_LABEL,
    },
    host,
    participants,
    isHost: host.id === ME.id,
    isJoined,
    meetPointLocked: view.meetPointLocked,
  };
}

export interface RideBoard {
  rides: LiveRide[];
  isLive: boolean;
  pendingId: string | null;
  notice: string | null;
  clearNotice: () => void;
  /* Resolves to true when the viewer ended up joined. */
  toggleJoin: (rideId: string) => Promise<boolean>;
  postRide: (input: RideFormInput) => Promise<RideActionResult>;
  cancelRide: (rideId: string) => Promise<RideActionResult>;
}

/* `live` is undefined in the /demo prototype and the list from the
   database in the app. */
export function useRideBoard(live: LiveRide[] | undefined, fixtures: readonly RidePost[]): RideBoard {
  const router = useRouter();
  const [demoJoined, setDemoJoined] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isLive = live !== undefined;

  const rides = useMemo(
    () =>
      live ??
      fixtures
        .map((post) => fixtureToLiveRide(post, demoJoined.has(post.id)))
        .filter((ride): ride is LiveRide => ride !== null),
    [live, fixtures, demoJoined],
  );

  const toggleJoin = useCallback(
    async (rideId: string) => {
      const ride = rides.find((candidate) => candidate.post.id === rideId);
      if (!ride) return false;

      if (!isLive) {
        const isFull = ride.post.takenSpots >= ride.post.totalSpots;
        if (!ride.isJoined && isFull) return false;
        setDemoJoined((previous) => toggleSetValue(previous, rideId));
        return !ride.isJoined;
      }

      setPendingId(rideId);
      setNotice(null);
      const result = ride.isJoined ? await leaveRideAction(rideId) : await joinRideAction(rideId);
      setPendingId(null);

      if (!result.ok) setNotice(result.message);
      startTransition(() => router.refresh());
      return !ride.isJoined && result.ok;
    },
    [rides, isLive, router],
  );

  const postRide = useCallback(
    async (input: RideFormInput): Promise<RideActionResult> => {
      if (!isLive) {
        return { ok: true, message: "Demo: nothing is saved." };
      }
      const result = await createRideAction(input);
      if (result.ok) startTransition(() => router.refresh());
      return result;
    },
    [isLive, router],
  );

  const cancelRide = useCallback(
    async (rideId: string): Promise<RideActionResult> => {
      if (!isLive) {
        return { ok: false, message: "Demo: nothing is saved." };
      }
      setPendingId(rideId);
      const result = await cancelRideAction(rideId);
      setPendingId(null);
      if (!result.ok) setNotice(result.message);
      startTransition(() => router.refresh());
      return result;
    },
    [isLive, router],
  );

  return {
    rides,
    cancelRide,
    isLive,
    pendingId,
    notice,
    clearNotice: () => setNotice(null),
    toggleJoin,
    postRide,
  };
}

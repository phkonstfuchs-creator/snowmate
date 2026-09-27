"use client";

import { OFFLINE_RESULT, settle } from "@/lib/settle";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RidePost } from "@/lib/types";
import { ME, getUserById, getUsersByIds } from "@/lib/data";
import { toggleSetValue } from "@/lib/collections";
import { toVisibleRide } from "./visibility";
import { isClosedTo } from "./capacity";
import { LOCKED_MEET_POINT_LABEL, type LiveRide } from "./live-ride";
import {
  cancelRideAction,
  createRideAction,
  joinRideAction,
  leaveRideAction,
  respondRideRequestAction,
  updateRideAction,
  type RideActionResult,
} from "./actions";
import type { RideEditInput, RideFormInput } from "./ride-input";

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
    isPending: false,
    requests: [],
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
  updateRide: (rideId: string, input: RideEditInput) => Promise<RideActionResult>;
  respondRequest: (rideId: string, userId: string, accept: boolean) => Promise<void>;
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
        if (isClosedTo(ride.post, ride.isJoined)) return false;
        setDemoJoined((previous) => toggleSetValue(previous, rideId));
        return !ride.isJoined;
      }

      setPendingId(rideId);
      setNotice(null);
      const result = await settle<RideActionResult>(
        ride.isJoined || ride.isPending ? leaveRideAction(rideId) : joinRideAction(rideId),
        OFFLINE_RESULT,
      );
      setPendingId(null);

      if (!result.ok) setNotice(result.message);
      startTransition(() => router.refresh());
      /* Only a real join counts; asking to join is not being in yet. */
      return !ride.isJoined && !ride.isPending && result.ok && !("pending" in result && result.pending);
    },
    [rides, isLive, router],
  );

  const postRide = useCallback(
    async (input: RideFormInput): Promise<RideActionResult> => {
      if (!isLive) {
        return { ok: true, message: "Demo: nothing is saved." };
      }
      const result = await settle<RideActionResult>(createRideAction(input), OFFLINE_RESULT);
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
      const result = await settle<RideActionResult>(cancelRideAction(rideId), OFFLINE_RESULT);
      setPendingId(null);
      if (!result.ok) setNotice(result.message);
      startTransition(() => router.refresh());
      return result;
    },
    [isLive, router],
  );

  const updateRide = useCallback(
    async (rideId: string, input: RideEditInput): Promise<RideActionResult> => {
      if (!isLive) {
        return { ok: true, message: "Demo: nothing is saved." };
      }
      const result = await settle<RideActionResult>(updateRideAction(rideId, input), OFFLINE_RESULT);
      if (result.ok) startTransition(() => router.refresh());
      return result;
    },
    [isLive, router],
  );

  const respondRequest = useCallback(
    async (rideId: string, userId: string, accept: boolean) => {
      if (!isLive) return;
      setPendingId(rideId);
      setNotice(null);
      const result = await settle<RideActionResult>(respondRideRequestAction(rideId, userId, accept), OFFLINE_RESULT);
      setPendingId(null);
      if (!result.ok) setNotice(result.message);
      startTransition(() => router.refresh());
    },
    [isLive, router],
  );

  return {
    rides,
    respondRequest,
    cancelRide,
    updateRide,
    isLive,
    pendingId,
    notice,
    clearNotice: () => setNotice(null),
    toggleJoin,
    postRide,
  };
}

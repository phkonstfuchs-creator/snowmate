"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBasePath } from "@/hooks/useBasePath";
import { City, User } from "@/lib/types";
import { RIDE_POSTS } from "@/lib/data";
import { APP_TIME_ZONE, type LiveRide } from "./live-ride";
import { useRideBoard } from "./useRideBoard";
import RideCard from "@/components/feed/RideCard";
import RideDetailSheet from "@/components/feed/RideDetailSheet";
import PostRideModal from "@/components/feed/PostRideModal";
import PenguinMascot from "@/components/PenguinMascot";
import UserProfileSheet from "@/components/UserProfileSheet";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";

export interface LiveFeed {
  /* null when the backend could not be reached */
  rides: LiveRide[] | null;
  viewerIsMinor: boolean;
  defaultCity: City;
  /* Posting and joining need a finished profile (enforced in the database). */
  profileComplete?: boolean;
}

/* `live` is undefined in the /demo prototype, which runs on fixtures. */
export default function FeedScreen({ live }: { live?: LiveFeed }) {
  const basePath = useBasePath();
  const [city, setCity] = useState<City>(live?.defaultCity ?? "innsbruck");
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const board = useRideBoard(live ? live.rides ?? [] : undefined, RIDE_POSTS);
  const unavailable = live !== undefined && live.rides === null;

  const [storyUser, setStoryUser] = useState<User | null>(null);
  /* Counter, not a boolean: the hold time lives inside the keyframe,
     so joining a second ride while the first toast is up would leave
     the animation mid-flight. A changing key remounts it and the toast
     starts over instead of being swallowed. */
  const [xpToast, setXpToast] = useState(0);

  /* The effect owns the timer, so each new toast cancels the previous
     one through the cleanup and unmounting cannot leave one running. */
  useEffect(() => {
    if (xpToast === 0) return;
    const timer = setTimeout(() => setXpToast(0), 1750);
    return () => clearTimeout(timer);
  }, [xpToast]);

  /* Public events have their own screen; the feed is the crew's rides. */
  const rides = board.rides.filter((ride) => ride.post.city === city && ride.post.visibility === "friends");
  const selectedRide = rides.find((ride) => ride.post.id === selectedPostId) ?? null;
  const ridersToday = board.isLive
    ? new Set(rides.flatMap((ride) => [ride.host.id, ...ride.participants.map((user) => user.id)])).size
    : city === "innsbruck" ? 174 : 127;

  const liveUsers = [
    ...new Map(rides.flatMap((ride) => [ride.host, ...ride.participants]).map((user) => [user.id, user])).values(),
  ];

  const handleJoin = async (postId: string) => {
    if (board.pendingId) return;
    const didJoin = await board.toggleJoin(postId);
    if (didJoin) {
      setXpToast((n) => n + 1);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <PenguinMascot size={28} />
            <span className="text-mono-label" style={{ color: "var(--ink-0)" }}>Snowmate</span>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="card-tap text-mono-label flex min-h-11 items-center gap-1.5 px-3"
            style={{ background: "var(--rust)", color: "var(--paper-0)", border: "var(--rule-thin)", boxShadow: "var(--shadow-print)" }}
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

      {/* Story strip */}
      {liveUsers.length > 0 && (
        <div className="flex gap-3.5 px-4 pt-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {liveUsers.map((u) => (
            <button
              key={u.id}
              /* The profile sheet still runs on fixture stats; real
                 accounts do not share those yet. */
              onClick={board.isLive ? undefined : () => setStoryUser(u)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
            >
              <div className="story-ring">
                <Avatar id={u.id} initials={u.avatar} size={52} />
              </div>
              <span className="text-[0.65rem] font-bold max-w-[60px] truncate" style={{ color: "var(--text-tertiary)" }}>
                {u.name.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Live strip */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="text-mono-label" style={{ color: "var(--ink-0)" }}>
            {ridersToday} out today
          </span>
        </div>
        <span className="text-mono-label" style={{ color: "var(--ink-2)" }}>
          {board.isLive
            ? new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: APP_TIME_ZONE })
            : "Tue 8 Jan"}
        </span>
      </div>

      {live && live.profileComplete === false && (
        <Link
          href="/profile"
          className="card-tap mx-4 mb-3 flex items-center justify-between gap-3 px-3 py-3"
          style={{ background: "var(--paper-1)", border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--ink-0)" }}>
            Finish your profile to post rides and join your crew.
          </span>
          <Icon name="chevron-right" size={16} color="var(--ink-0)" strokeWidth={2} />
        </Link>
      )}

      {(board.notice || unavailable) && (
        <div role="status" className="mx-4 mb-3 flex items-start justify-between gap-3 px-3 py-2.5" style={{ border: "1px solid var(--crimson)", background: "var(--paper-1)" }}>
          <p className="text-sm" style={{ color: "var(--crimson)" }}>
            {board.notice ?? "Rides could not be loaded. Pull to refresh or try again shortly."}
          </p>
          {board.notice && (
            <button type="button" onClick={board.clearNotice} aria-label="Dismiss" className="-my-2 -mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center">
              <Icon name="x" size={14} color="var(--crimson)" strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {/* Feed */}
      <div className="px-4 pb-4 space-y-3">
        {rides.map((ride, i) => (
          <RideCard
            key={ride.post.id}
            post={ride.post}
            author={ride.host}
            joinedUsers={ride.participants}
            isJoined={ride.isJoined}
            isHost={ride.isHost}
            index={i}
            onClick={() => setSelectedPostId(ride.post.id)}
            onJoin={() => handleJoin(ride.post.id)}
          />
        ))}

        {/* An empty feed usually means no friends yet. That is exactly
            when the answer is the open events, not a prompt to post
            something yourself. */}
        {rides.length === 0 && !unavailable && (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <PenguinMascot size={72} />
            <div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>No rides today yet</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                Open events need no crew.
              </p>
            </div>
            <Link
              href={`${basePath}/events`}
              className="card-tap font-display px-5 py-3 text-base uppercase"
              style={{
                background: "var(--rust)",
                color: "var(--paper-0)",
                border: "var(--rule-thick)",
                boxShadow: "var(--shadow-print)",
              }}
            >
              Browse open events
            </Link>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowPostModal(true)}
        aria-label="Post a ride"
        className="card-tap fixed bottom-[96px] z-40 flex h-14 w-14 items-center justify-center"
        style={{
          right: "max(1rem, calc((100vw - 430px) / 2 + 1rem))",
          background: "var(--rust)",
          border: "var(--rule-thick)",
          boxShadow: "var(--shadow-print)",
        }}
      >
        <Icon name="plus" size={22} color="var(--paper-0)" strokeWidth={2.5} />
      </button>

      {/* Post Modal */}
      {showPostModal && (
        <PostRideModal
          city={city}
          onClose={() => setShowPostModal(false)}
          onPost={board.postRide}
          {...(live ? { mayGoPublic: !live.viewerIsMinor } : {})}
        />
      )}

      {/* Ride Detail Sheet */}
      {selectedRide && (
        <RideDetailSheet
          post={selectedRide.post}
          author={selectedRide.host}
          joinedUsers={selectedRide.participants}
          isJoined={selectedRide.isJoined}
          isHost={selectedRide.isHost}
          profilesEnabled={!board.isLive}
          {...(board.isLive
            ? {
                onCancel: () => {
                  setSelectedPostId(null);
                  void board.cancelRide(selectedRide.post.id);
                },
              }
            : {})}
          onClose={() => setSelectedPostId(null)}
          onJoin={() => { void handleJoin(selectedRide.post.id); }}
        />
      )}

      {/* Story user profile */}
      {storyUser && (
        <UserProfileSheet user={storyUser} onClose={() => setStoryUser(null)} />
      )}

      {/* XP toast */}
      {xpToast > 0 && (
        <div className="fixed bottom-[150px] left-1/2 -translate-x-1/2 z-[450] pointer-events-none">
          <div
            key={xpToast}
            className="xp-toast text-mono-label flex items-center gap-2 px-4 py-2.5"
            style={{ background: "var(--ink-0)", color: "var(--paper-0)", boxShadow: "var(--shadow-print)" }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M8 1L2 8.5h5L6 13l6-7.5H7L8 1Z" fill="var(--ochre)" />
            </svg>
            +50 XP · You are in
          </div>
        </div>
      )}
    </>
  );
}

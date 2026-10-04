"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBasePath } from "@/hooks/useBasePath";
import { City, User } from "@/lib/types";
import { ME, RIDE_POSTS } from "@/lib/data";
import { canPostPublicRide } from "./visibility";
import { APP_TIME_ZONE, type LiveRide } from "./live-ride";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/locales";
import { translateText } from "@/lib/i18n/translate";
import { useRideBoard } from "./useRideBoard";
import EditRideSheet from "./EditRideSheet";
import ReportBlockSheet from "@/features/safety/ReportBlockSheet";
import type { SafetyTarget } from "@/features/safety/reports";
import RideCard from "@/components/feed/RideCard";
import RideDetailSheet from "@/components/feed/RideDetailSheet";
import PostRideModal from "@/components/feed/PostRideModal";
import PenguinMascot from "@/components/PenguinMascot";
import UserProfileSheet from "@/features/demo/UserProfileSheet";
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
  const t = useT();
  const locale = useLocale();
  const [city, setCity] = useState<City>(live?.defaultCity ?? "innsbruck");
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
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
  const editingRide = rides.find((ride) => ride.post.id === editingPostId) ?? null;
  /* "Out today" means today: a ride next Saturday is in the list, but
     its riders are not on the mountain yet. */
  const todaysRides = rides.filter((ride) => ride.isToday);
  const ridersToday = board.isLive
    ? todaysRides.reduce((sum, ride) => sum + 1 + ride.post.takenSpots, 0)
    : city === "innsbruck" ? 174 : 127;

  const liveUsers = [
    ...new Map(todaysRides.flatMap((ride) => [ride.host, ...ride.participants]).map((user) => [user.id, user])).values(),
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
            {t("common.post")}
          </button>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]}
            value={city}
            onChange={setCity}
            ariaLabel={t("common.region")}
          />
        </div>
      </header>

      {/* Story strip */}
      {liveUsers.length > 0 && (
        <div className="flex gap-3.5 px-4 pt-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {liveUsers.map((u) => (
            <button
              key={u.id}
              /* Live: opens the ride this person is on today. The demo
                 profile sheet runs on fixture stats, which real accounts
                 do not have. */
              onClick={
                board.isLive
                  ? () => {
                      const ride = todaysRides.find(
                        (item) => item.host.id === u.id || item.participants.some((p) => p.id === u.id),
                      );
                      if (ride) setSelectedPostId(ride.post.id);
                    }
                  : () => setStoryUser(u)
              }
              aria-label={u.name}
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
            {t("feed.outToday", { n: ridersToday })}
          </span>
        </div>
        <span className="text-mono-label" style={{ color: "var(--ink-2)" }}>
          {board.isLive
            ? new Date().toLocaleDateString(INTL_LOCALE[locale], { weekday: "short", day: "numeric", month: "short", timeZone: APP_TIME_ZONE })
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
            {t("feed.finishProfile")}
          </span>
          <Icon name="chevron-right" size={16} color="var(--ink-0)" strokeWidth={2} />
        </Link>
      )}

      {(board.notice || unavailable) && (
        <div role="status" className="mx-4 mb-3 flex items-start justify-between gap-3 px-3 py-2.5" style={{ border: "1px solid var(--crimson)", background: "var(--paper-1)" }}>
          <p className="text-sm" style={{ color: "var(--crimson)" }}>
            {board.notice ? translateText(t, board.notice) : t("feed.unavailable")}
          </p>
          {board.notice && (
            <button type="button" onClick={board.clearNotice} aria-label={t("common.dismiss")} className="-my-2 -mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center">
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
            isPending={ride.isPending}
            isHost={ride.isHost}
            requestCount={ride.requests.length}
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
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>{t("feed.empty")}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                {t("feed.emptyHint")}
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
              {t("feed.browseEvents")}
            </Link>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowPostModal(true)}
        aria-label={t("feed.postRide")}
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
          mayGoPublic={live ? !live.viewerIsMinor : canPostPublicRide(ME)}
        />
      )}

      {/* Ride Detail Sheet */}
      {selectedRide && !storyUser && (
        <RideDetailSheet
          post={selectedRide.post}
          author={selectedRide.host}
          joinedUsers={selectedRide.participants}
          isJoined={selectedRide.isJoined}
          isPending={selectedRide.isPending}
          requests={selectedRide.requests}
          onRespond={(userId, accept) => { void board.respondRequest(selectedRide.post.id, userId, accept); }}
          isHost={selectedRide.isHost}
          onOpenProfile={board.isLive ? undefined : setStoryUser}
          {...(board.isLive
            ? {
                onSafety: (user: User) => {
                  setSelectedPostId(null);
                  setSafetyTarget({ userId: user.id, name: user.name, rideId: selectedRide.post.id });
                },
                onEdit: () => {
                  setSelectedPostId(null);
                  setEditingPostId(selectedRide.post.id);
                },
                onCancel: () => {
                  /* Cancelling also drops everyone who joined. */
                  if (!window.confirm(t("feed.confirmCancel"))) return;
                  setSelectedPostId(null);
                  void board.cancelRide(selectedRide.post.id);
                },
              }
            : {})}
          onClose={() => setSelectedPostId(null)}
          onJoin={() => { void handleJoin(selectedRide.post.id); }}
        />
      )}

      {safetyTarget && <ReportBlockSheet target={safetyTarget} onClose={() => setSafetyTarget(null)} />}

      {editingRide && (
        <EditRideSheet
          post={editingRide.post}
          onSave={(input) => board.updateRide(editingRide.post.id, input)}
          onClose={() => setEditingPostId(null)}
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
            {board.isLive ? t("feed.youAreIn") : `+50 XP · ${t("feed.youAreIn")}`}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { openRideChatAction } from "@/features/chat/actions";
import Link from "next/link";
import { useBasePath } from "@/hooks/useBasePath";
import { City, User } from "@/lib/types";
import { ME, RIDE_POSTS } from "@/lib/data";
import { canPostPublicRide } from "./visibility";
import type { LiveRide } from "./live-ride";
import { useT } from "@/lib/i18n/client";
import { translateText } from "@/lib/i18n/translate";
import { useRideBoard } from "./useRideBoard";
import EditRideSheet from "./EditRideSheet";
import ReportBlockSheet from "@/features/safety/ReportBlockSheet";
import type { SafetyTarget } from "@/features/safety/reports";
import RideCard from "@/components/feed/RideCard";
import RideDetailSheet from "@/components/feed/RideDetailSheet";
import PostRideModal from "@/components/feed/PostRideModal";
import PostComposer from "@/features/posts/PostComposer";
import PostList from "@/features/posts/PostList";
import type { Post } from "@/features/posts/post";
import Wordmark from "@/components/ui/Wordmark";
import UserProfileSheet from "@/features/demo/UserProfileSheet";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";
import Avatar from "@/components/ui/Avatar";
import NextStep from "@/components/ui/NextStep";
import { initialsFor } from "@/features/profile/profile-input";
import CreateMenu from "./CreateMenu";
import { crewOutLine } from "./crew-out";
import PushAsk, { usePushAskAfterJoin } from "@/features/notifications/PushAsk";

export interface LiveFeed {
  /* null when the backend could not be reached */
  rides: LiveRide[] | null;
  viewerIsMinor: boolean;
  defaultCity: City;
  /* Posting and joining need a finished profile (enforced in the database). */
  profileComplete?: boolean;
  /* Ski-day posts from the viewer and their friends; null when unreachable. */
  posts?: Post[] | null;
  /* The viewer's account id, so a ride sheet offers report and block for
     everyone in it except the viewer. */
  viewerId?: string;
  /* Confirmed friends' ids: only they are named in "who's out today". */
  friendIds?: string[];
}

/* `live` is undefined in the /demo prototype, which runs on fixtures. */
export default function FeedScreen({ live, referenceTime }: { live?: LiveFeed; referenceTime?: string }) {
  const basePath = useBasePath();
  const t = useT();
  const [city, setCity] = useState<City>(live?.defaultCity ?? "innsbruck");
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  const board = useRideBoard(live ? live.rides ?? [] : undefined, RIDE_POSTS, referenceTime);
  const unavailable = live !== undefined && live.rides === null;

  const [storyUser, setStoryUser] = useState<User | null>(null);
  /* Counter, not a boolean: the hold time lives inside the keyframe,
     so joining a second ride while the first toast is up would leave
     the animation mid-flight. A changing key remounts it and the toast
     starts over instead of being swallowed. */
  const [xpToast, setXpToast] = useState(0);
  const pushAsk = usePushAskAfterJoin(live !== undefined);

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
  const facesToday = [...new Map(todaysRides.flatMap((ride) => [ride.host, ...ride.participants]).map((user) => [user.id, user])).values()];
  const ridersToday = todaysRides.reduce((sum, ride) => sum + 1 + ride.post.takenSpots, 0);
  const outLine = crewOutLine(facesToday, live ? live.friendIds ?? [] : ME.friendIds, ridersToday);
  const shownFaces = outLine && outLine.friendIds.length > 0
    ? facesToday.filter((user) => outLine.friendIds.includes(user.id))
    : facesToday;

  const handleJoin = async (postId: string) => {
    if (board.pendingId) return;
    /* Leaving or withdrawing happens in the ride sheet, which says so.
       A second tap on the card never takes you out by accident. */
    const ride = rides.find((candidate) => candidate.post.id === postId);
    if (ride && (ride.isJoined || ride.isPending) && selectedPostId !== postId) {
      setSelectedPostId(postId);
      return;
    }
    const didJoin = await board.toggleJoin(postId);
    if (didJoin) {
      setXpToast((n) => n + 1);
      pushAsk.offer();
    }
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <Wordmark size={30} />
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            aria-label={t("create.open")}
            className="card-tap flex h-12 w-12 items-center justify-center"
            style={{ background: "var(--rust)", color: "var(--on-accent)", borderRadius: 999 }}
          >
            <Icon name="plus" size={22} strokeWidth={2.4} />
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

      {/* "Who's out today?" first: faces, not just a number. */}
      {outLine && (
        <section aria-label={t(outLine.key, outLine.values)} className="flex items-center gap-3 px-4 pt-4 pb-1">
          <div className="flex -space-x-1.5">
            {shownFaces.slice(0, 4).map((user) => (
              <Avatar key={user.id} id={user.id} initials={initialsFor(user.name, user.handle)} size={32} className="ring-2 ring-[var(--paper-0)]" />
            ))}
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--ink-0)" }}>
            {t(outLine.key, outLine.values)}
          </span>
        </section>
      )}

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

      {/* Nothing today: say what to do instead of an empty screen. */}
      {todaysRides.length === 0 && !unavailable && (
        <NextStep icon="plus" text={t("next.feed")} action={t("feed.postRide")} onAction={() => setShowPostModal(true)} />
      )}

      {/* Feed */}
      <div className="px-4 pt-3 pb-4 space-y-3">
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

        {rides.length === 0 && !unavailable && (
          <p className="py-6 text-center text-sm" style={{ color: "var(--ink-2)" }}>
            {t("feed.empty")} · <Link href={`${basePath}/events`} className="font-semibold underline">{t("feed.browseEvents")}</Link>
          </p>
        )}
      </div>

      {/* Post Modal */}
      {live && <PostList posts={live.posts ?? []} title={t("posts.fromCrew")} />}
      {live && <div className="pb-4" />}


      {showComposer && <PostComposer city={city} onClose={() => setShowComposer(false)} />}

      {showCreate && (
        <CreateMenu
          basePath={basePath}
          onPostRide={() => setShowPostModal(true)}
          onShareDay={live ? () => setShowComposer(true) : undefined}
          onClose={() => setShowCreate(false)}
        />
      )}

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
          viewerId={live?.viewerId}
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
                ...(selectedRide.isHost || (selectedRide.isJoined && !selectedRide.isPending)
                  ? { onOpenChat: () => { void openRideChatAction(selectedRide.post.id); } }
                  : {}),
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

      {pushAsk.pending && !selectedRide && !safetyTarget && !editingRide && !storyUser && (
        <PushAsk onClose={pushAsk.dismiss} />
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

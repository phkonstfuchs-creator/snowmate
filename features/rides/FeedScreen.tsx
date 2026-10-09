"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GoStartSheet from "@/features/go/GoStartSheet";
import { goCandidates } from "@/features/go/go-candidates";
import GoInterest from "@/features/go/GoInterest";
import GoOverview from "@/features/go/GoOverview";
import type { GoOverviewResult } from "@/features/go/go-status";
import DayPlanSheet from "@/features/day-plans/DayPlanSheet";
import DayPlanOverview from "@/features/day-plans/DayPlanOverview";
import type { DayPlan, DayPlanResult } from "@/features/day-plans/day-plan";
import type { RideFormInput } from "./ride-input";
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
  goInterests?: GoOverviewResult;
  dayPlans?: DayPlanResult;
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
  const router = useRouter();
  const [goGate, setGoGate] = useState<{ rideId: string; blocked: boolean } | null>(null);
  const goResult = live?.goInterests;
  const t = useT();
  const [city, setCity] = useState<City>(live?.defaultCity ?? "innsbruck");
  const [showGoStart, setShowGoStart] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDayPlan, setShowDayPlan] = useState(false);
  const [editingDayPlan, setEditingDayPlan] = useState<DayPlan | undefined>();
  const [demoPlans, setDemoPlans] = useState<DayPlan[]>([]);
  const [rideDraft, setRideDraft] = useState<Pick<RideFormInput, "resort" | "rideDate" | "meetTime" | "meetPoint">>();
  const [showCreate, setShowCreate] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const selectRide = (rideId: string | null) => {
    setGoGate(null);
    setSelectedPostId(rideId);
  };
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [safetyTarget, setSafetyTarget] = useState<SafetyTarget | null>(null);
  const board = useRideBoard(live ? live.rides ?? [] : undefined, RIDE_POSTS, referenceTime);
  const unavailable = live !== undefined && live.rides === null;
  const dayPlans = live?.dayPlans ?? (!live ? { status: "ok" as const, plans: demoPlans } : undefined);
  const openDayPlan = (plan?: DayPlan) => {
    setEditingDayPlan(plan);
    setShowDayPlan(true);
  };
  const openPostRide = () => {
    setRideDraft(undefined);
    setShowPostModal(true);
  };
  const useDayPlanForRide = (plan: DayPlan) => {
    setCity(plan.city);
    setRideDraft({ resort: plan.resort, rideDate: plan.planDate, meetTime: plan.meetTime, meetPoint: plan.meetingText });
    setShowPostModal(true);
  };

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
  const selectedRide = board.rides.find((ride) => ride.post.id === selectedPostId) ?? null;
  const selectedId = selectedRide?.post.id;
  const updateGoGate = useCallback((blocked: boolean) => {
    if (selectedId) setGoGate({ rideId: selectedId, blocked });
  }, [selectedId]);
  const openGoPlan = (rideId: string) => {
    const ride = board.rides.find((r) => r.post.id === rideId);
    if (ride) { setCity(ride.post.city); selectRide(rideId); }
  };
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
      selectRide(postId);
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

      <section aria-label={t("coord.quick")} className="grid grid-cols-2 gap-3 px-4 pt-4 pb-3">
        <button type="button" onClick={() => setShowGoStart(true)} className="card-tap min-w-0 rounded-2xl border p-3 text-left" style={{ minHeight: 112, background: "var(--paper-1)", borderColor: "var(--ink-0)" }}>
          <Icon name="users" size={22} color="var(--rust)" />
          <span className="mt-2 block font-bold">{t("go.title")}</span>
          <span className="mt-1 block text-sm leading-snug" style={{ color: "var(--ink-1)" }}>{t("coord.goHint")}</span>
        </button>
        <Link href={live ? `${basePath}/map?action=lift` : `${basePath}/map`} className="card-tap min-w-0 rounded-2xl border p-3" style={{ minHeight: 112, background: "var(--paper-1)", borderColor: "var(--ink-0)" }}>
          <Icon name="mountain" size={22} color="var(--rust)" />
          <span className="mt-2 block font-bold">{t("coord.liftTitle")}</span>
          <span className="mt-1 block text-sm leading-snug" style={{ color: "var(--ink-1)" }}>{t("coord.liftHint")}</span>
        </Link>
      </section>

      {dayPlans && <DayPlanOverview result={dayPlans} demo={!live} onOpen={openDayPlan} onShare={useDayPlanForRide} onRetry={() => router.refresh()} />}

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

      {live && goResult && <GoOverview result={goResult} onOpen={openGoPlan} onRetry={() => router.refresh()} />}

      {/* Nothing today: say what to do instead of an empty screen. */}
      {todaysRides.length === 0 && !unavailable && (
        <NextStep icon="plus" text={t("next.feed")} action={t("feed.postRide")} onAction={openPostRide} />
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
            onClick={() => selectRide(ride.post.id)}
            onJoin={() => {
              if (live && goResult && !ride.isJoined && !ride.isPending &&
                (goResult.status === "unavailable" || goResult.interests.some(({ go }) => go.rideId === ride.post.id))) {
                selectRide(ride.post.id);
              } else { void handleJoin(ride.post.id); }
            }}
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


      {showGoStart && (
        <GoStartSheet
          rides={live && goResult?.status === "ok" && !unavailable ? goCandidates(board.rides, new Date()) : []}
          unavailable={unavailable || (!!live && goResult?.status !== "ok")}
          demo={!live}
          basePath={basePath}
          onSelect={openGoPlan}
          onCreate={openPostRide}
          onPlan={() => openDayPlan()}
          onRetry={() => router.refresh()}
          onClose={() => setShowGoStart(false)}
        />
      )}

      {showDayPlan && <DayPlanSheet
        initial={editingDayPlan}
        city={editingDayPlan?.city ?? city}
        demo={!live}
        onClose={() => { setShowDayPlan(false); if (live) router.refresh(); }}
        onDeleted={(id) => { if (!live) setDemoPlans((plans) => plans.filter((plan) => plan.id !== id)); }}
        onSaved={(plan) => {
          if (!live) setDemoPlans((plans) => [...plans.filter((old) => old.id !== plan.id), plan]);
          setShowDayPlan(false);
          if (live) router.refresh();
        }}
      />}

      {showComposer && <PostComposer city={city} onClose={() => setShowComposer(false)} />}

      {showCreate && (
        <CreateMenu
          basePath={basePath}
          onPostRide={openPostRide}
          onShareDay={live ? () => setShowComposer(true) : undefined}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showPostModal && (
        <PostRideModal
          city={city}
          initialValues={rideDraft}
          onClose={() => { setShowPostModal(false); setRideDraft(undefined); }}
          onPost={board.postRide}
          mayGoPublic={live ? !live.viewerIsMinor : canPostPublicRide(ME)}
        />
      )}

      {/* Ride Detail Sheet */}
      {selectedRide && !storyUser && (
        <RideDetailSheet
          goContent={live && goResult && !selectedRide.isHost ? (
            <GoInterest key={selectedRide.post.id} rideId={selectedRide.post.id}
              totalSpots={selectedRide.post.totalSpots} isJoined={selectedRide.isJoined}
              isPending={selectedRide.isPending} onGate={updateGoGate} />
          ) : undefined}
          joinBlocked={!!live && !!goResult && !selectedRide.isHost &&
            (goGate?.rideId !== selectedRide.post.id || goGate.blocked)}
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
                  selectRide(null);
                  setSafetyTarget({ userId: user.id, name: user.name, rideId: selectedRide.post.id });
                },
                onEdit: () => {
                  selectRide(null);
                  setEditingPostId(selectedRide.post.id);
                },
                ...(selectedRide.isHost || (selectedRide.isJoined && !selectedRide.isPending)
                  ? { onOpenChat: () => { void openRideChatAction(selectedRide.post.id); } }
                  : {}),
                onCancel: () => {
                  /* Cancelling also drops everyone who joined. */
                  if (!window.confirm(t("feed.confirmCancel"))) return;
                  selectRide(null);
                  void board.cancelRide(selectedRide.post.id);
                },
              }
            : {})}
          onClose={() => selectRide(null)}
          onJoin={() => {
            if (live && goResult && !selectedRide.isJoined && !selectedRide.isPending &&
              (goGate?.rideId !== selectedRide.post.id || goGate.blocked)) return;
            void handleJoin(selectedRide.post.id);
          }}
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

      {pushAsk.pending && !showGoStart && !showDayPlan && !showPostModal && !selectedRide && !safetyTarget && !editingRide && !storyUser && (
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { useBasePath } from "@/hooks/useBasePath";
import { City, User } from "@/lib/types";
import { RIDE_POSTS, getUserById, getUsersByIds, ME } from "@/lib/data";
import {
  createRideView,
  toggleRideMembership,
} from "@/features/rides/ride-state";
import RideCard from "@/components/feed/RideCard";
import RideDetailSheet from "@/components/feed/RideDetailSheet";
import PostRideModal from "@/components/feed/PostRideModal";
import PenguinMascot from "@/components/PenguinMascot";
import UserProfileSheet from "@/components/UserProfileSheet";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";

export default function FeedPage() {
  const basePath = useBasePath();
  const [city, setCity] = useState<City>("innsbruck");
  const [showPostModal, setShowPostModal] = useState(false);
  const [joinedPostIds, setJoinedPostIds] = useState<Set<string>>(new Set());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [storyUser, setStoryUser] = useState<User | null>(null);
  const [showXp, setShowXp] = useState(false);

  const ridersToday = city === "innsbruck" ? 174 : 127;
  const posts = RIDE_POSTS.filter((p) => p.city === city);
  const selectedPost = posts.find((p) => p.id === selectedPostId) ?? null;

  const liveUsers = [...new Set(posts.flatMap((p) => [p.authorId, ...p.joinedUserIds]))]
    .map(getUserById)
    .filter(Boolean) as User[];

  const handleJoin = (postId: string) => {
    const post = RIDE_POSTS.find((candidate) => candidate.id === postId);
    if (!post) return;

    const nextJoinedPostIds = toggleRideMembership(joinedPostIds, post);
    const didJoin =
      !joinedPostIds.has(postId) && nextJoinedPostIds.has(postId);

    if (didJoin) {
      setShowXp(true);
      setTimeout(() => setShowXp(false), 1750);
    }

    setJoinedPostIds(nextJoinedPostIds);
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
              onClick={() => setStoryUser(u)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-90 transition-transform"
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
        <span className="text-mono-label" style={{ color: "var(--ink-2)" }}>Tue 8 Jan</span>
      </div>

      {/* Feed */}
      <div className="px-4 pb-4 space-y-3 stagger">
        {posts.map((post, i) => {
          const author = getUserById(post.authorId);
          if (!author) return null;

          const isJoined = joinedPostIds.has(post.id);
          const rideView = createRideView({
            post,
            joinedUsers: getUsersByIds(post.joinedUserIds),
            currentUser: ME,
            isJoined,
          });

          return (
            <RideCard
              key={post.id}
              post={rideView.post}
              author={author}
              joinedUsers={rideView.joinedUsers}
              isJoined={isJoined}
              index={i}
              onClick={() => setSelectedPostId(post.id)}
              onJoin={() => handleJoin(post.id)}
            />
          );
        })}

        {/* An empty feed usually means no friends yet. That is exactly
            when the answer is the open events, not a prompt to post
            something yourself. */}
        {posts.length === 0 && (
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
        <PostRideModal city={city} onClose={() => setShowPostModal(false)} onPost={() => {}} />
      )}

      {/* Ride Detail Sheet */}
      {selectedPost && (() => {
        const author = getUserById(selectedPost.authorId);
        if (!author) return null;

        const isJoined = joinedPostIds.has(selectedPost.id);
        const rideView = createRideView({
          post: selectedPost,
          joinedUsers: getUsersByIds(selectedPost.joinedUserIds),
          currentUser: ME,
          isJoined,
        });

        return (
          <RideDetailSheet
            post={rideView.post}
            author={author}
            joinedUsers={rideView.joinedUsers}
            isJoined={isJoined}
            onClose={() => setSelectedPostId(null)}
            onJoin={() => { handleJoin(selectedPost.id); }}
          />
        );
      })()}

      {/* Story user profile */}
      {storyUser && (
        <UserProfileSheet user={storyUser} onClose={() => setStoryUser(null)} />
      )}

      {/* XP toast */}
      {showXp && (
        <div className="fixed bottom-[150px] left-1/2 -translate-x-1/2 z-[450] pointer-events-none">
          <div
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

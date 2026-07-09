"use client";

import { useState } from "react";
import { City, User } from "@/lib/types";
import { RIDE_POSTS, getUserById, ME } from "@/lib/data";
import RideCard from "@/components/feed/RideCard";
import RideDetailSheet from "@/components/feed/RideDetailSheet";
import PostRideModal from "@/components/feed/PostRideModal";
import PenguinMascot from "@/components/PenguinMascot";
import UserProfileSheet from "@/components/UserProfileSheet";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";

export default function FeedPage() {
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
    if (!joinedPostIds.has(postId)) {
      setShowXp(true);
      setTimeout(() => setShowXp(false), 1750);
    }
    setJoinedPostIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: "rgba(10,14,18,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <PenguinMascot size={30} />
            <span className="font-display text-white" style={{ fontSize: 21, fontWeight: 800 }}>Snowmate</span>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 text-sm font-black px-4 py-2 rounded-full shadow-lg active:scale-95 transition-transform"
            style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}
          >
            <Icon name="plus" size={14} strokeWidth={2.4} />
            Post
          </button>
        </div>
        <div className="px-4 pb-3">
          <SegmentedControl
            options={[{ value: "innsbruck", label: "Innsbruck" }, { value: "salzburg", label: "Salzburg" }]}
            value={city}
            onChange={setCity}
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
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            <span className="font-mono font-bold">{ridersToday}</span> out today
          </span>
        </div>
        <span className="text-xs font-bold" style={{ color: "var(--text-disabled)" }}>Tue, Jan 8</span>
      </div>

      {/* Feed */}
      <div className="px-4 pb-4 space-y-3 stagger">
        {posts.map((post, i) => {
          const author = getUserById(post.authorId)!;
          const isJoined = joinedPostIds.has(post.id);
          const allJoined = post.joinedUserIds.map((id) => getUserById(id)!).filter(Boolean);
          const displayJoined = isJoined ? [...allJoined, ME].filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i) : allJoined;
          const displayPost = isJoined
            ? { ...post, takenSpots: post.takenSpots + 1, joinedUserIds: [...post.joinedUserIds, "me"] }
            : post;

          return (
            <RideCard
              key={post.id}
              post={displayPost}
              author={author}
              joinedUsers={displayJoined}
              currentUserId="me"
              isJoined={isJoined}
              index={i}
              onClick={() => setSelectedPostId(post.id)}
              onJoin={() => handleJoin(post.id)}
            />
          );
        })}

        {posts.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <PenguinMascot size={72} />
            <div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>No rides yet today</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>Be the first — post your ride!</p>
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowPostModal(true)}
        className="fixed bottom-[88px] w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
        style={{ right: "max(1rem, calc((100vw - 430px) / 2 + 1rem))", background: "var(--ice-500)" }}
      >
        <Icon name="plus" size={22} color="white" strokeWidth={2.5} />
      </button>

      {/* Post Modal */}
      {showPostModal && (
        <PostRideModal city={city} onClose={() => setShowPostModal(false)} onPost={() => {}} />
      )}

      {/* Ride Detail Sheet */}
      {selectedPost && (() => {
        const author = getUserById(selectedPost.authorId)!;
        const isJoined = joinedPostIds.has(selectedPost.id);
        const allJoined = selectedPost.joinedUserIds.map((id) => getUserById(id)!).filter(Boolean);
        const displayJoined = isJoined ? [...allJoined, ME].filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i) : allJoined;
        const displayPost = isJoined
          ? { ...selectedPost, takenSpots: selectedPost.takenSpots + 1, joinedUserIds: [...selectedPost.joinedUserIds, "me"] }
          : selectedPost;
        return (
          <RideDetailSheet
            post={displayPost}
            author={author}
            joinedUsers={displayJoined}
            currentUserId="me"
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
          <div className="xp-toast flex items-center gap-2 text-white font-bold text-sm px-4 py-2.5 rounded-full shadow-lg" style={{ background: "var(--bg-surface-2)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8 1L2 8.5h5L6 13l6-7.5H7L8 1Z" fill="var(--ice-300)" />
            </svg>
            <span className="font-mono">+50 XP</span> · You're in!
          </div>
        </div>
      )}
    </>
  );
}

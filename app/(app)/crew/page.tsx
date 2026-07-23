"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  MOCK_USERS,
  getUserById,
  getUsersByIds,
  CREWS,
  CONVERSATIONS,
  ME,
} from "@/lib/data";
import ConversationThread from "@/components/ConversationThread";
import { useScrollLock } from "@/hooks/useScrollLock";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";

const D = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER = "var(--border-subtle)";
const MUTED = "var(--text-tertiary)";
const INK = "var(--text-primary)";
const BRAND = "var(--accent-primary)";

type Tab = "crew" | "squads" | "pending" | "chats";

function AddFriendSheet({ onClose }: { onClose: () => void }) {
  useScrollLock();
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const suggestions = MOCK_USERS.filter((u) => !ME.friendIds.includes(u.id) && u.id !== "me").slice(0, 3);

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} aria-hidden />
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label="Find friends" style={{ paddingBottom: "max(env(safe-area-inset-bottom,16px),24px)" }}>
        <div className="flex justify-center pt-3 mb-4">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <h2 className="font-black text-lg px-5 mb-1" style={{ color: INK }}>Find friends</h2>
        <p className="text-xs font-bold px-5 mb-4" style={{ color: MUTED }}>People your friends know</p>

        <div className="px-5 space-y-2 mb-5">
          {suggestions.map((u) => {
            const isReq = requested.has(u.id);
            return (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
                <Avatar id={u.id} initials={u.avatar} size={40} verified={u.accountType === "verified"} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm" style={{ color: INK }}>{u.name}</p>
                  <p className="text-xs font-bold" style={{ color: MUTED }}>@{u.handle} · Lvl {u.level}</p>
                </div>
                <button
                  onClick={() => setRequested((prev) => new Set(prev).add(u.id))}
                  disabled={isReq}
                  className="text-xs font-black px-3.5 py-2 rounded-full active:scale-90 transition-all"
                  style={isReq
                    ? { background: "var(--accent-primary-subtle)", color: BRAND }
                    : { background: BRAND, color: D }
                  }
                >
                  {isReq ? "Sent" : "Add"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-5">
          <button className="w-full py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-transform" style={{ border: `2px solid ${BRAND}`, color: BRAND, background: "transparent" }}>
            Share invite link · +200 XP
          </button>
        </div>
      </div>
    </>
  );
}

export default function CrewPage() {
  const [tab, setTab] = useState<Tab>("crew");
  const [showAdd, setShowAdd] = useState(false);
  const [pendingActions, setPendingActions] = useState<Record<string, "accepted" | "declined">>({});
  const [selectedConvUserId, setSelectedConvUserId] = useState<string | null>(null);

  const myFriends = getUsersByIds(ME.friendIds);
  const pendingUsers = MOCK_USERS.filter((u) => !ME.friendIds.includes(u.id) && u.id !== "me").slice(0, 3);
  const totalUnread = CONVERSATIONS.reduce((sum, c) => sum + c.messages.filter((m) => m.senderId !== "me" && !m.isRead).length, 0);
  const handlePending = (userId: string, action: "accepted" | "declined") => setPendingActions((prev) => ({ ...prev, [userId]: action }));

  const TAB_LABELS: Record<Tab, string> = { crew: "Crew", squads: "Squads", pending: "Requests", chats: "Chats" };

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "rgba(10,14,18,0.96)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>Crew</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>{myFriends.length} friends · {CREWS.length} squads</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            aria-label="Find friends"
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: BRAND, color: D }}
          >
            <Icon name="plus" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex px-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {(["crew", "squads", "pending", "chats"] as const).map((t) => {
            const badge = t === "pending"
              ? pendingUsers.filter((u) => !pendingActions[u.id]).length
              : t === "chats" ? totalUnread : 0;
            const isActive = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 pb-2.5 text-xs font-black transition-colors duration-150 relative pt-1"
                style={{ color: isActive ? BRAND : MUTED }}
              >
                {TAB_LABELS[t]}
                {badge > 0 && (
                  <span className="absolute -top-0.5 right-[15%] w-4 h-4 rounded-full text-white text-[0.6rem] font-black flex items-center justify-center font-mono" style={{ background: "var(--accent-warm)" }}>
                    {badge}
                  </span>
                )}
                {isActive && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ background: BRAND }} />}
              </button>
            );
          })}
        </div>
      </header>

      {/* Crew tab */}
      {tab === "crew" && (
        <div className="px-4 pt-4 pb-6">
          <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4" style={{ background: "var(--accent-primary-subtle)", border: "1px solid rgba(79,195,240,0.25)" }}>
            <Icon name="shield-check" size={16} color={BRAND} strokeWidth={1.6} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black" style={{ color: BRAND }}>Friend-graph model</p>
              <p className="text-xs font-medium mt-0.5 leading-snug" style={{ color: MUTED }}>Rides and location are only visible to confirmed friends. No open matching.</p>
            </div>
          </div>

          <div className="space-y-2">
            {myFriends.map((friend) => (
              <div key={friend.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
                <Avatar id={friend.id} initials={friend.avatar} size={42} verified={friend.accountType === "verified"} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm" style={{ color: INK }}>{friend.name}</span>
                    <span className="text-[0.65rem] font-black px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-primary-subtle)", color: BRAND }}>
                      Lvl {friend.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: MUTED }}>@{friend.handle}</span>
                    <span className="text-xs font-bold" style={{ color: MUTED }}>{friend.daysThisSeason} days</span>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedConvUserId(friend.id); setTab("chats"); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                  style={{ background: "var(--accent-primary-subtle)" }}
                >
                  <Icon name="message-circle" size={15} color={BRAND} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl p-5 flex flex-col items-center gap-3 text-center" style={{ border: `2px dashed ${BORDER}` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
              <Icon name="user-plus" size={18} color={BRAND} strokeWidth={2} />
            </div>
            <div>
              <p className="font-black text-sm" style={{ color: INK }}>Invite friends</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: MUTED }}>Earn 200 XP per friend you invite</p>
            </div>
            <button className="text-sm font-black px-5 py-2 rounded-full active:scale-95 transition-transform" style={{ background: BRAND, color: D }}>
              Share link
            </button>
          </div>
        </div>
      )}

      {/* Squads tab */}
      {tab === "squads" && (
        <div className="px-4 pt-4 pb-6 space-y-3">
          {CREWS.map((crew) => {
            const members = crew.memberIds.map((id) => getUserById(id)!).filter(Boolean);
            return (
              <div key={crew.id} className="rounded-2xl p-4" style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black text-[0.9375rem]" style={{ color: INK }}>{crew.name}</p>
                    <p className="text-xs font-bold" style={{ color: MUTED }}>{members.length} members · {crew.city === "innsbruck" ? "Innsbruck" : "Salzburg"}</p>
                  </div>
                  <button className="text-xs font-black px-3 py-1.5 rounded-full" style={{ background: "var(--accent-primary-subtle)", color: BRAND }}>Plan a ride</button>
                </div>
                <div className="flex -space-x-2">
                  {members.map((m) => (
                    <div key={m.id} className="rounded-full" style={{ boxShadow: "0 0 0 2px var(--bg-surface-1)" }}>
                      <Avatar id={m.id} initials={m.avatar} size={32} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <button className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-black" style={{ border: `2px dashed ${BORDER}`, color: BRAND }}>
            <Icon name="plus" size={14} strokeWidth={2.2} />
            Create new squad
          </button>
        </div>
      )}

      {/* Pending tab */}
      {tab === "pending" && (
        <div className="px-4 pt-4 pb-6 space-y-3">
          {pendingUsers.map((user) => {
            const action = pendingActions[user.id];
            return (
              <div key={user.id} className="rounded-2xl p-4"
                style={{
                  border: `1px solid ${action === "accepted" ? "rgba(74,222,154,0.4)" : BORDER}`,
                  background: action === "accepted" ? "rgba(74,222,154,0.1)" : action === "declined" ? "var(--bg-canvas)" : SURFACE,
                  opacity: action === "declined" ? 0.5 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <Avatar id={user.id} initials={user.avatar} size={42} verified={user.accountType === "verified"} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm" style={{ color: INK }}>{user.name}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: MUTED }}>@{user.handle} · Level {user.level}</span>
                    <p className="text-xs font-medium mt-1.5" style={{ color: MUTED }}>{user.daysThisSeason} days this season · {user.resortsVisited} resorts</p>
                    {user.isMinor && (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-black px-2 py-0.5 rounded-full mt-1.5" style={{ background: "var(--accent-warm-subtle)", color: "var(--ember-400)" }}>Under 18</span>
                    )}
                    {action ? (
                      <p className="text-xs font-black mt-3" style={{ color: action === "accepted" ? "var(--status-success)" : MUTED }}>
                        {action === "accepted" ? "Friend confirmed" : "Request declined"}
                      </p>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handlePending(user.id, "declined")}
                          className="flex-1 py-2 rounded-xl text-sm font-black active:scale-95 transition-transform"
                          style={{ border: `1.5px solid ${BORDER}`, color: MUTED }}>
                          Decline
                        </button>
                        <button onClick={() => handlePending(user.id, "accepted")}
                          className="flex-1 py-2 rounded-xl text-sm font-black active:scale-95 transition-transform"
                          style={{ background: BRAND, color: D }}>
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chats tab */}
      {tab === "chats" && !selectedConvUserId && (
        <div className="pb-6">
          {CONVERSATIONS.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
                <Icon name="message-circle" size={28} color={BRAND} strokeWidth={1.8} />
              </div>
              <div>
                <p className="font-black" style={{ color: INK }}>No chats yet</p>
                <p className="text-sm font-medium mt-1" style={{ color: MUTED }}>Message someone from a ride post!</p>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              {CONVERSATIONS.map((conv) => {
                const otherId = conv.participantIds.find((id) => id !== "me")!;
                const other = getUserById(otherId);
                if (!other) return null;
                const lastMsg = conv.messages[conv.messages.length - 1];
                const unread = conv.messages.filter((m) => m.senderId !== "me" && !m.isRead).length;

                return (
                  <button key={conv.id} className="flex items-center gap-3 px-4 py-3.5 w-full text-left transition-colors" style={{ borderBottom: `1px solid ${BORDER}` }}
                    onClick={() => setSelectedConvUserId(otherId)}>
                    <div className="relative flex-shrink-0">
                      <Avatar id={other.id} initials={other.avatar} size={46} />
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-white text-[0.6rem] font-black flex items-center justify-center font-mono" style={{ background: "var(--accent-warm)" }}>
                          {unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={clsx("text-sm", unread > 0 ? "font-black" : "font-bold")} style={{ color: INK }}>{other.name}</span>
                        <span className="text-[0.6rem] flex-shrink-0 ml-2" style={{ color: MUTED }}>{lastMsg?.sentAt}</span>
                      </div>
                      <p className={clsx("text-xs truncate", unread > 0 ? "font-bold" : "font-medium")} style={{ color: MUTED }}>
                        {conv.contextType === "ride" && <span className="font-black" style={{ color: BRAND }}>Ride · </span>}
                        {lastMsg ? (lastMsg.senderId === "me" ? "You: " : "") + lastMsg.text : "No messages yet"}
                      </p>
                    </div>

                    <Icon name="chevron-right" size={14} color={MUTED} strokeWidth={1.8} className="flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedConvUserId && <ConversationThread userId={selectedConvUserId} onClose={() => setSelectedConvUserId(null)} />}
      {showAdd && <AddFriendSheet onClose={() => setShowAdd(false)} />}
    </>
  );
}

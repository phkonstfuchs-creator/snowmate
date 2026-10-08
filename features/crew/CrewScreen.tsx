"use client";

import { useState } from "react";
import Link from "next/link";
import { useBasePath } from "@/hooks/useBasePath";
import clsx from "clsx";
import {
  getUserById,
  getUsersByIds,
  CREWS,
  CONVERSATIONS,
  ME,
} from "@/lib/data";
import ConversationThread from "@/features/demo/ConversationThread";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";

const D = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER = "var(--border-subtle)";
const MUTED = "var(--text-tertiary)";
const INK = "var(--text-primary)";
const BRAND = "var(--accent-primary)";

type Tab = "crew" | "squads" | "chats";

export default function CrewScreen() {
  const basePath = useBasePath();
  const t = useT();
  const [tab, setTab] = useState<Tab>("crew");
  const [selectedConvUserId, setSelectedConvUserId] = useState<string | null>(null);

  const myFriends = getUsersByIds(ME.friendIds);
  const totalUnread = CONVERSATIONS.reduce((sum, c) => sum + c.messages.filter((m) => m.senderId !== "me" && !m.isRead).length, 0);

  const TAB_LABELS: Record<Tab, string> = { crew: "Crew", squads: "Squads", chats: "Chats" };

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="large-title" style={{ color: INK }}>Crew</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>{t("demo.crewCounts", { friends: myFriends.length, squads: CREWS.length })}</p>
          </div>
          <Link
            href={`${basePath}/people`}
            aria-label={t("nav.discover")}
            className="card-tap flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: BRAND, color: D }}
          >
            <Icon name="user-plus" size={17} strokeWidth={2.2} />
          </Link>
        </div>

        <div className="flex px-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {(["crew", "squads", "chats"] as const).map((key) => {
            const badge = key === "chats" ? totalUnread : 0;
            const isActive = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                className="flex-1 min-h-11 pb-2.5 text-xs font-black transition-colors duration-150 relative pt-1"
                style={{ color: isActive ? BRAND : MUTED }}
              >
                {TAB_LABELS[key]}
                {badge > 0 && (
                  <span className="absolute -top-0.5 right-[15%] w-4 h-4 rounded-full text-[0.6rem] font-black flex items-center justify-center font-mono" style={{ background: "var(--accent-warm)", color: "var(--ink-0)" }}>
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
          <div className="flex items-start gap-3 rounded-[14px] px-4 py-3 mb-4" style={{ background: "var(--accent-primary-subtle)", border: "var(--rule-thin)" }}>
            <Icon name="shield-check" size={16} color={BRAND} strokeWidth={1.6} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium leading-snug" style={{ color: MUTED }}>{t("crew.visibilityNote")}</p>
            </div>
          </div>

          <div className="space-y-2">
            {myFriends.map((friend) => (
              <div key={friend.id} className="flex items-center gap-3 p-3 rounded-[14px]" style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
                <Avatar id={friend.id} initials={friend.avatar} size={42} verified={friend.accountType === "verified"} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm" style={{ color: INK }}>{friend.name}</span>
                    <span className="text-mono-label px-1.5" style={{ background: "var(--accent-primary-subtle)", color: "var(--rust-ink)" }}>
                      {t("demo.level", { n: friend.level })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-bold" style={{ color: MUTED }}>@{friend.handle}</span>
                    <span className="text-xs font-bold" style={{ color: MUTED }}>{t("demo.days", { n: friend.daysThisSeason })}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedConvUserId(friend.id); setTab("chats"); }}
                  aria-label={t("chat.messageTo", { name: friend.name })}
                  className="h-11 w-11 rounded-full flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
                  style={{ background: "var(--accent-primary-subtle)" }}
                >
                  <Icon name="message-circle" size={15} color={BRAND} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>

          <Link
            href={`${basePath}/people`}
            className="card-tap mt-5 flex items-center gap-3 p-4"
            style={{ border: `2px dashed ${BORDER}` }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-primary-subtle)" }}>
              <Icon name="user-plus" size={18} color={BRAND} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm" style={{ color: INK }}>{t("nav.discover")}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: MUTED }}>{t("demo.discoverHint")}</p>
            </div>
            <Icon name="chevron-right" size={16} color={MUTED} strokeWidth={2} />
          </Link>
        </div>
      )}

      {/* Squads tab */}
      {tab === "squads" && (
        <div className="px-4 pt-4 pb-6 space-y-3">
          {CREWS.map((crew) => {
            const members = crew.memberIds.map((id) => getUserById(id)!).filter(Boolean);
            return (
              <div key={crew.id} className="rounded-[14px] p-4" style={{ border: `1px solid ${BORDER}`, background: SURFACE }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-black text-[0.9375rem]" style={{ color: INK }}>{crew.name}</p>
                    <p className="text-xs font-bold" style={{ color: MUTED }}>{t("demo.members", { n: members.length })} · {crew.city === "innsbruck" ? "Innsbruck" : "Salzburg"}</p>
                  </div>
                  <button className="text-mono-label px-3 py-1.5" style={{ background: "var(--accent-primary-subtle)", color: "var(--rust-ink)" }}>{t("demo.planRide")}</button>
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
          <button className="w-full rounded-[14px] p-4 flex items-center justify-center gap-2 text-sm font-black" style={{ border: `2px dashed ${BORDER}`, color: BRAND }}>
            <Icon name="plus" size={14} strokeWidth={2.2} />
            {t("demo.newSquad")}
          </button>
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
                <p className="font-black" style={{ color: INK }}>{t("demo.noChats")}</p>
                <p className="text-sm font-medium mt-1" style={{ color: MUTED }}>{t("demo.noChatsHint")}</p>
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
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-[0.6rem] font-black flex items-center justify-center font-mono" style={{ background: "var(--accent-warm)", color: "var(--ink-0)" }}>
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
                        {conv.contextType === "ride" && <span className="font-black" style={{ color: BRAND }}>{t("demo.rideChat")} · </span>}
                        {lastMsg ? (lastMsg.senderId === "me" ? `${t("chat.you")}: ` : "") + lastMsg.text : t("chat.noMessages")}
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
    </>
  );
}

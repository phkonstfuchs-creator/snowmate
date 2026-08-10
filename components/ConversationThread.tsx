"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { getUserById, CONVERSATIONS } from "@/lib/data";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useScrollLock } from "@/hooks/useScrollLock";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";

interface Props {
  userId: string;
  onClose: () => void;
}

export default function ConversationThread({ userId, onClose }: Props) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const existing = CONVERSATIONS.find(
    (c) => c.participantIds.includes("me") && c.participantIds.includes(userId)
  );
  const [messages, setMessages] = useState<Message[]>(existing?.messages ?? []);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  useScrollLock();
  const other = getUserById(userId);
  if (!other) return null;

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = {
      id: `new-${messages.length}`,
      senderId: "me",
      text,
      sentAt: "Jetzt",
      isRead: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Unterhaltung mit ${other.name}`}
      tabIndex={-1}
      className="fixed flex flex-col"
      style={{
        top: 0,
        bottom: 0,
        left: "50%",
        width: "min(100vw, 430px)",
        transform: "translateX(-50%)",
        zIndex: 510,
        background: "var(--bg-canvas)",
        animation: "slide-up-full 0.28s var(--ease-standard) both",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4"
        style={{
          paddingTop: "max(44px, env(safe-area-inset-top, 16px) + 16px)",
          paddingBottom: "12px",
          background: "var(--paper-0)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close conversation"
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          style={{ background: "var(--bg-surface-2)" }}
        >
          <Icon name="chevron-left" size={16} color="var(--text-tertiary)" strokeWidth={2} />
        </button>
        <Avatar id={other.id} initials={other.avatar} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{other.name}</p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            @{other.handle}
            {existing?.contextType === "ride" && (
              <span style={{ color: "var(--sky)" }}> · via ride</span>
            )}
          </p>
        </div>
        {other.instagram && (
          <a
            href={`https://instagram.com/${other.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="card-tap text-[0.65rem] font-bold px-2 py-1 rounded-full"
            style={{ background: "rgba(200,90,160,0.14)", color: "#e59ecb", border: "1px solid rgba(200,90,160,0.3)" }}
          >
            IG
          </a>
        )}
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3 space-y-3">
        {existing?.contextType === "ride" && messages.length > 0 && (
          <div className="flex justify-center mb-1">
            <span className="text-mono-label px-3 py-1" style={{ background: "var(--accent-primary-subtle)", color: "var(--sky)" }}>
              Ausfahrtskontext
            </span>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 pt-14 text-center">
            <Avatar id={other.id} initials={other.avatar} size={56} />
            <div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>{other.name}</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>No messages yet.</p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === "me";
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && <Avatar id={other.id} initials={other.avatar} size={24} />}
              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <div className={isMe ? "msg-bubble-me" : "msg-bubble-them"}>{msg.text}</div>
                <p className="text-[0.58rem] px-1" style={{ color: "var(--text-disabled)" }}>{msg.sentAt}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 flex gap-2"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-canvas)" }}
      >
        <input
          className="flex-1 form-input"
          placeholder="Nachricht …"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          aria-label="Nachricht senden"
          className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 flex-shrink-0"
          style={{ background: "var(--sky)" }}
        >
          <Icon name="arrow-right" size={16} color="white" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

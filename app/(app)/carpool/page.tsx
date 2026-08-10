"use client";

import { useState } from "react";
import { City } from "@/lib/types";
import { CARPOOL_POSTS, getUserById } from "@/lib/data";
import { toggleSetValue } from "@/lib/collections";
import ResortScene from "@/components/ResortScene";
import PenguinMascot from "@/components/PenguinMascot";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useSheetDismiss } from "@/hooks/useSheetDismiss";
import { useScrollLock } from "@/hooks/useScrollLock";
import Avatar from "@/components/ui/Avatar";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Icon from "@/components/ui/Icon";

const D = "var(--bg-canvas)";
const SURFACE = "var(--bg-surface-1)";
const BORDER = "var(--border-subtle)";
const MUTED = "var(--text-tertiary)";
const INK = "var(--text-primary)";
const BRAND = "var(--accent-primary)";

function OfferModal({ onClose }: { onClose: () => void }) {
  useScrollLock();
  const { state, dismiss } = useSheetDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>(dismiss);
  const [role, setRole] = useState<"driver" | "rider">("driver");
  return (
    <>
      <div className="sheet-overlay" data-state={state} onClick={dismiss} aria-hidden />
      <div ref={dialogRef} className="sheet-panel" data-state={state} role="dialog" aria-modal="true" aria-label="Offer a ride" tabIndex={-1} style={{ paddingBottom: "max(env(safe-area-inset-bottom,16px),28px)" }}>
        <div className="flex justify-center pt-3 mb-4">
          <div className="w-9 h-1 rounded-full" style={{ background: BORDER }} />
        </div>
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="font-display" style={{ color: INK, fontSize: 20, fontWeight: 800 }}>Offer a ride</h2>
          <button type="button" onClick={dismiss} aria-label="Close dialog" className="flex h-11 w-11 items-center justify-center">
            <Icon name="x" size={18} color={MUTED} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 space-y-3 mb-5">
          <SegmentedControl
            options={[{ value: "driver", label: "I am driving" }, { value: "rider", label: "I need a seat" }]}
            value={role}
            onChange={setRole}
            ariaLabel="Carpool role"
          />
          {[
            { id: "carpool-from", label: "Departure", placeholder: "e.g. Innsbruck Hbf" },
            { id: "carpool-to", label: "Destination", placeholder: "e.g. Stubai Glacier" },
            { id: "carpool-time", label: "Time", placeholder: "08:00" },
          ].map(({ id, label, placeholder }) => (
            <div key={id}>
              <label htmlFor={id} className="text-xs font-bold mb-1.5 block" style={{ color: MUTED }}>{label}</label>
              <input id={id} className="form-input" placeholder={placeholder} />
            </div>
          ))}
        </div>

        <div className="px-5">
          <button
            onClick={dismiss}
            className="w-full py-4 rounded-none font-black text-base active:scale-95 transition-transform"
            style={{ background: BRAND, color: D }}
          >
            Publish offer
          </button>
        </div>
      </div>
    </>
  );
}

export default function CarpoolPage() {
  const [city, setCity] = useState<City>("innsbruck");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  const posts = CARPOOL_POSTS.filter((p) => p.city === city);
  const drivers = posts.filter((p) => p.role === "driver");
  const riders = posts.filter((p) => p.role === "rider");

  const toggle = (id: string) =>
    setRequestedIds((previousIds) => toggleSetValue(previousIds, id));

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{ background: "var(--paper-0)", borderBottom: "var(--rule-heavy)" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="font-display" style={{ color: INK, fontSize: 24, fontWeight: 800 }}>Carpool</h1>
            <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>Get a seat or offer one</p>
          </div>
          <button
            onClick={() => setShowOfferModal(true)}
            className="flex min-h-11 items-center gap-1.5 text-sm font-black px-4 rounded-full active:scale-95 transition-transform"
            style={{ background: BRAND, color: D }}
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
            ariaLabel="Region"
          />
        </div>
      </header>

      <div className="px-4 pt-4 pb-6 space-y-6">
        {/* Drivers */}
        {drivers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--status-success)" }} />
              <h2 className="font-black text-xs uppercase" style={{ color: "var(--status-success)" }}>
                Seats open · {drivers.length}
              </h2>
            </div>
            <div className="space-y-3 stagger">
              {drivers.map((post, i) => {
                const author = getUserById(post.authorId);
                if (!author) return null;

                const isReq = requestedIds.has(post.id);
                return (
                  <div
                    key={post.id}
                    className="rounded-none overflow-hidden anim-fade-up"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, animationDelay: `${i * 55}ms` }}
                  >
                    {/* Mini resort scene strip */}
                    <div className="relative h-20 overflow-hidden">
                      <ResortScene name={post.resort} className="absolute inset-0 w-full h-full" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)" }} />
                      <div className="absolute inset-0 flex items-center px-4 gap-3">
                        <Avatar id={author.id} initials={author.avatar} size={42} />
                        <div>
                          <p className="font-black text-white text-sm">{author.name}</p>
                          <p className="text-white/70 text-xs font-semibold">{post.resort}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1 bg-black/40 rounded-full px-2.5 py-1">
                          <span className="text-xs font-black text-white font-mono">{post.availableSeats}</span>
                          <Icon name="users" size={12} color="white" strokeWidth={2} />
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Icon name="map-pin" size={12} color={BRAND} strokeWidth={2} />
                          <span className="text-sm font-bold" style={{ color: INK }}>{post.departurePoint}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Icon name="clock" size={12} color={MUTED} strokeWidth={2} />
                          <span className="text-xs font-bold font-mono" style={{ color: MUTED }}>{post.departureTime}</span>
                        </div>
                      </div>
                      {post.note && (
                        <p className="text-xs mb-3 font-medium" style={{ color: MUTED }}>{post.note}</p>
                      )}
                      <button
                        onClick={() => toggle(post.id)}
                        disabled={post.availableSeats === 0 && !isReq}
                        className="w-full min-h-11 rounded-none text-sm font-black transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px]"
                        style={isReq
                          ? { background: "var(--accent-primary-subtle)", color: BRAND }
                          : post.availableSeats === 0
                          ? { background: "var(--bg-surface-2)", color: MUTED, opacity: 0.5 }
                          : { background: BRAND, color: D }
                        }
                      >
                        {isReq ? "Requested" : "Request seat"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Riders seeking */}
        {riders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--rust)" }} />
              <h2 className="font-black text-xs uppercase" style={{ color: "var(--rust)" }}>
                Looking for a seat · {riders.length}
              </h2>
            </div>
            <div className="space-y-2 stagger">
              {riders.map((post, i) => {
                const author = getUserById(post.authorId);
                if (!author) return null;

                const isOffered = requestedIds.has(post.id + "_offer");
                return (
                  <div
                    key={post.id}
                    className="rounded-none p-4 anim-fade-up"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, animationDelay: `${i * 55}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar id={author.id} initials={author.avatar} size={38} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm" style={{ color: INK }}>{author.name}</span>
                          <span className="text-[0.62rem] font-black px-2 py-0.5 rounded-full" style={{ background: "var(--accent-warm-subtle)", color: "var(--rust-ink)" }}>
                            Needs a seat
                          </span>
                        </div>
                        <p className="text-xs font-semibold mt-1" style={{ color: MUTED }}>
                          {post.departurePoint} → {post.resort} · {post.departureTime}
                        </p>
                        {post.note && <p className="text-xs mt-1.5 font-medium" style={{ color: MUTED }}>{post.note}</p>}
                        <button
                          onClick={() => toggle(post.id + "_offer")}
                          className="mt-3 w-full min-h-11 rounded-none text-sm font-black transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px]"
                          style={isOffered
                            ? { background: "var(--accent-primary-subtle)", color: BRAND }
                            : { border: `2px solid ${BRAND}`, color: BRAND, background: "transparent" }
                          }
                        >
                          {isOffered ? "Offered" : "Offer a ride"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {drivers.length === 0 && riders.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <PenguinMascot size={64} />
            <div>
              <p className="font-black text-lg" style={{ color: INK }}>No carpools yet</p>
              <p className="text-sm font-medium mt-1" style={{ color: MUTED }}>Offer a ride or ask for a seat.</p>
            </div>
          </div>
        )}
      </div>

      {showOfferModal && <OfferModal onClose={() => setShowOfferModal(false)} />}
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import PenguinMascot from "@/components/PenguinMascot";

/* Öffentliche Startseite. Bewusst eine ehrliche Fallstudie statt
   einer Marketingseite: Sie führt nirgends in den Login, weil
   hinter dem Login noch Beispieldaten liegen. Die App selbst
   bleibt unter /onboarding erreichbar. */

export const metadata: Metadata = {
  title: "Snowmate — coordinating ski days in Innsbruck and Salzburg",
  description:
    "A mobile web app that replaces scattered WhatsApp groups for young skiers in Austria. Honest build status included.",
};

const REPO = "https://github.com/phkonstfuchs-creator/snowmate";

const PAPER = "var(--paper-0)";
const PAPER_1 = "var(--paper-1)";
const INK = "var(--ink-0)";
const INK_1 = "var(--ink-1)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";
const PINE = "var(--pine)";

function Rule({ label, num }: { label: string; num: string }) {
  return (
    <div className="section-rule mt-16">
      <h2 className="text-mono-label" style={{ color: INK }}>
        {label}
      </h2>
      <span className="text-mono-label" style={{ color: RUST }}>
        {num}
      </span>
    </div>
  );
}

const SCREENS: [string, string, string][] = [
  ["feed", "Feed", "Who is riding today, where, and how many spots are left."],
  ["map", "Map", "All resorts in the region — riders split by riding style, not just a headcount."],
  ["carpool", "Carpool", "Two-sided board: drivers offer seats, riders ask for one."],
  ["crew", "Crew", "Friends, requests and chats that are attached to a ride or a carpool."],
  ["profile", "Profile", "Season record: days, resorts, streak, stamps and a regional ranking."],
];

/* Zeilen bewusst als Daten, damit Status und Begründung nicht
   auseinanderlaufen koennen */
const STATUS: [string, "live" | "mock" | "next" | "later", string][] = [
  ["Sign-up, e-mail confirmation, sign-in, sign-out", "live", "Supabase, server-side sessions, protected routes"],
  ["Row Level Security on the profile shell", "live", "with negative policy tests (pgTAP)"],
  ["Feed, Map, Carpool, Crew, Profile", "mock", "rendered from a local fixture file — no database behind them"],
  ["Meeting-point visibility rule", "mock", "promised in the UI, not enforced on the server yet"],
  ["Onboarding answers (region, style, name)", "mock", "written to browser storage and never read back"],
  ["Rides, crews and chats on a real schema", "next", "needs tables, RLS and negative tests first"],
  ["Snow depth and fresh-snow alerts", "next", "Open-Meteo covers this — verified, free, no key"],
  ["Lift status per resort", "next", "no single free source; per-resort feeds or community input"],
  ["Vertical metres, heatmaps", "later", "needs a native app — iOS suspends background JS in a PWA"],
];

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  live: { bg: PINE, fg: PAPER, label: "Working" },
  mock: { bg: "var(--paper-2)", fg: INK, label: "Prototype" },
  next: { bg: "var(--ochre)", fg: INK, label: "Next" },
  later: { bg: "transparent", fg: INK_2, label: "Later" },
};

export default function Home() {
  return (
    <main className="paper-grain min-h-dvh" style={{ background: PAPER }}>
      <div className="mx-auto w-full max-w-[720px] px-5 pb-20">
        {/* ── Kopf ─────────────────────────────────────────── */}
        <header className="flex items-center gap-2 pt-7">
          <PenguinMascot size={26} />
          <span className="text-mono-label" style={{ color: INK }}>
            Snowmate
          </span>
        </header>

        <p className="text-mono-label mt-12" style={{ color: RUST }}>
          Innsbruck &amp; Salzburg · Season 25/26
        </p>
        <h1 className="text-display-hero mt-3" style={{ color: INK }}>
          Find{" "}
          <br />
          your{" "}
          <br />
          crew
        </h1>
        <p
          className="mt-6 max-w-[52ch] text-lg leading-relaxed"
          style={{ color: INK_1 }}
        >
          A mobile web app that answers one question for young skiers in
          Austria: <strong style={{ color: INK }}>who is riding today,
          where, and can I join?</strong> Today that gets negotiated across
          a dozen WhatsApp groups. Snowmate puts it in one place.
        </p>

        <div
          className="mt-8 flex flex-wrap items-center gap-3"
          style={{ borderTop: "var(--rule-thin)", paddingTop: 20 }}
        >
          <a
            href={REPO}
            className="card-tap font-display px-5 py-3 text-lg uppercase"
            style={{
              background: RUST,
              color: PAPER,
              border: "var(--rule-thick)",
              boxShadow: "var(--shadow-print)",
            }}
          >
            Read the code
          </a>
          <span className="text-sm" style={{ color: INK_2 }}>
            Built by Philipp Fuchs, 16, Saarbrücken
          </span>
        </div>

        {/* ── Problem ──────────────────────────────────────── */}
        <Rule label="The problem" num="01" />
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            [
              "Seasonal workers",
              "Four months on the mountain, all the free time in the world, and no local network.",
            ],
            [
              "Solo locals",
              "A season pass and nobody free today. Skiing alone is the fallback, not the plan.",
            ],
            [
              "Split-ability crews",
              "A group with mixed levels that cannot ride together and has to find sub-groups.",
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="text-mono-label" style={{ color: RUST }}>
                {title}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: INK_1 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          Snowmate is explicitly not a tracking app like Strava and not a
          location app like Snapchat Map. It is the coordination layer of the
          mountain, and it is crew-first.
        </p>

        {/* ── Produkt ──────────────────────────────────────── */}
        <Rule label="The product" num="02" />
        <p className="mb-8 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_2 }}>
          Screens are in German because the users are — students and seasonal
          workers around Innsbruck and Salzburg. Riding vocabulary stays
          English, because that is how they actually speak.
        </p>

        <div className="grid gap-10 sm:grid-cols-2">
          {SCREENS.map(([file, title, body]) => (
            <figure key={file}>
              <Image
                src={`/shots/${file}.webp`}
                alt={`Snowmate ${title} screen`}
                width={430}
                height={880}
                className="w-full"
                style={{ border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }}
              />
              <figcaption className="mt-4">
                <p className="font-display text-xl uppercase" style={{ color: INK }}>
                  {title}
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: INK_1 }}>
                  {body}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* ── Status ───────────────────────────────────────── */}
        <Rule label="What actually works" num="03" />
        <p className="mb-6 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          This is a working prototype, not a launched product. The honest
          split:
        </p>

        <div style={{ borderTop: "var(--rule-thin)" }}>
          {STATUS.map(([what, state, note]) => {
            const s = STATUS_STYLE[state]!;
            return (
              <div
                key={what}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3"
                style={{ borderBottom: "1px solid var(--border-hairline)" }}
              >
                <span
                  className="text-mono-label flex-shrink-0 px-2 py-0.5"
                  style={{
                    background: s.bg,
                    color: s.fg,
                    border: state === "later" ? "1px solid var(--ink-3)" : "none",
                    minWidth: 88,
                    textAlign: "center",
                  }}
                >
                  {s.label}
                </span>
                <span className="text-[0.9375rem]" style={{ color: INK }}>
                  {what}
                </span>
                <span className="w-full text-sm sm:w-auto" style={{ color: INK_2 }}>
                  {note}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Haltung ──────────────────────────────────────── */}
        <Rule label="Why I am not shipping faster" num="04" />
        <p className="max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          The users are 16 to 25, so a share of them are minors, and the app
          handles meeting points. That combination is the reason the social
          features still run on fixtures instead of a live database.
        </p>
        <p className="mt-4 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          The rule I set for myself is written into the repository: no real
          social, minor or location data gets connected before its own schema,
          authorization rules, negative RLS tests and server DTOs exist. I
          would rather show an honest prototype than a live app that leaks a
          15-year-old&rsquo;s location.
        </p>
        <p className="mt-4 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          The same reasoning killed a feature I had already designed: a
          satellite map advertising couloirs and off-piste lines. Steering
          teenagers into avalanche terrain is not a premium feature, it is a
          liability. It is gone.
        </p>

        {/* ── Handwerk ─────────────────────────────────────── */}
        <Rule label="How it is built" num="05" />
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ["Stack", "Next.js App Router, TypeScript, Tailwind, Supabase with server-side sessions."],
            ["Gates", "Lint, typecheck, unit coverage at 80% minimum, production build and mobile end-to-end runs in CI."],
            ["Design", "A custom design system, not a component library: warm paper instead of another dark UI, four screen-print spot colours, all text pairs checked against WCAG AA."],
            ["Accessibility", "Keyboard focus, focus traps in dialogs, reduced-motion support and touch targets were treated as requirements, not polish."],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="text-mono-label" style={{ color: RUST }}>
                {title}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: INK_1 }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* ── Gründernotiz ─────────────────────────────────── */}
        <Rule label="Who is building this" num="06" />
        <div
          className="px-5 py-5"
          style={{ background: PAPER_1, border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }}
        >
          <p className="max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
            I am Philipp Fuchs, 16, based in Saarbrücken. I run a small
            production studio for video, motion and web work with a business
            partner, and Snowmate is the product I am building on the side.
          </p>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
            I build with heavy AI pairing and I would rather say so than have
            you find it in the commit history. What I own is the product
            thinking, the architecture rules, the design direction and every
            call about what does not get shipped. The commits are public —
            judge the decisions.
          </p>
          <a
            href={REPO}
            className="text-mono-label mt-5 inline-block underline"
            style={{ color: RUST }}
          >
            github.com/phkonstfuchs-creator/snowmate
          </a>
        </div>

        <p className="mt-14 text-mono-label" style={{ color: INK_2 }}>
          Snowmate · Prototype · Not accepting sign-ups yet
        </p>
      </div>
    </main>
  );
}

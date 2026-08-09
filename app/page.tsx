import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PenguinMascot from "@/components/PenguinMascot";

/* Public landing page. Deliberately an honest case study rather
   than a marketing page: it never leads into the login, because
   there is only sample data behind it. The app itself stays
   reachable at /onboarding. */

export const metadata: Metadata = {
  title: "Snowmate: coordinating ski days in Innsbruck and Salzburg",
  description:
    "A mobile web app that replaces scattered WhatsApp groups for young skiers in Austria. Honest build status included.",
};

const REPO = "https://github.com/phkonstfuchs-creator/snowmate";
const LINKEDIN = "https://www.linkedin.com/in/philipp-k-fuchs";

/* Year plus fact. Concrete rather than flowery — the facts carry
   themselves, adjectives would only dilute them. */
const EXPERIENCE: [string, string][] = [
  [
    "Aug 2026",
    "Silicon Valley Technology and Management Program at San José State University, in the Bay Area.",
  ],
  [
    "Aug 2026 – Sep 2026",
    "Korea Tech & AI Founders Program, a cross-border founder track. German cohort in Saarbrücken, Korean cohort in Korea.",
  ],
  [
    "Jul 2026",
    "Bocconi Summer School, Entrepreneurship Lab in Milan.",
  ],
  [
    "Nov 2025 – Jan 2026",
    "ODDO BHF Future Pioneers. Built an AI-native multi-agent equity research MVP with an international team and pitched it to the bank's senior management in Paris.",
  ],
  [
    "2024, 2025",
    "Techstars Startup Weekend, on the podium twice: 2nd place in 2025, runner-up in 2024.",
  ],
];

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
  ["events", "Public events", "Open rides anyone can join without knowing a single person yet. The resort is public, the meeting point unlocks on joining."],
  ["map", "Map", "All resorts in the region, with riders split by riding style, not just a headcount."],
  ["carpool", "Carpool", "Two-sided board: drivers offer seats, riders ask for one."],
  ["crew", "Crew", "Friends, squads and chats that are attached to a ride or a carpool."],
  ["people", "Add people", "Search by name or handle, send a request, answer the ones you got. Minors are flagged, because that changes what accepting them means."],
  ["profile", "Profile", "Season record: days, resorts, streak, stamps and a regional ranking."],
];

/* Rows kept as data so status and reasoning cannot drift apart */
const STATUS: [string, "live" | "mock" | "next" | "later", string][] = [
  ["Sign-up, e-mail confirmation, sign-in, sign-out", "live", "Supabase, server-side sessions, protected routes"],
  ["Row Level Security on the profile shell", "live", "with negative policy tests (pgTAP)"],
  ["Feed, Events, Map, Carpool, Crew, Profile", "mock", "rendered from a local fixture file, no database behind them"],
  ["Meeting-point visibility rule", "mock", "tested logic in the frontend, not enforced on the server yet"],
  ["Payments for trips and carpool seats", "next", "the revenue model above: designed, not built, nothing is charged"],
  ["Onboarding answers (region, style, name)", "mock", "written to browser storage and never read back"],
  ["Rides, crews and chats on a real schema", "next", "needs tables, RLS and negative tests first"],
  ["Snow depth and fresh-snow alerts", "next", "Open-Meteo covers this: verified, free, no key"],
  ["Lift status per resort", "next", "no single free source; per-resort feeds or community input"],
  ["Vertical metres, heatmaps", "later", "needs a native app, because iOS suspends background JS in a PWA"],
];

/* Price and reasoning kept apart so the numbers do not disappear
   into prose. Order equals weight: the ski club trips are the
   driver, the Season Pass is a footnote. */
const REVENUE: { line: string; price: string; body: string; lead?: boolean }[] = [
  {
    line: "University ski club trips",
    price: "3% of the volume handled",
    lead: true,
    body: "Clubs run semester trips for 50 to 300 people on Excel, a WhatsApp group and private bank transfers. Snowmate handles signup, seat allocation, payment, the participant list and cancellations. A trip with 150 people at 300 € is 45,000 € moving through one organiser who is currently doing it by hand.",
  },
  {
    line: "Carpool fee",
    price: "0.99 € per matched ride",
    body: "Charged to the passenger, never to the driver, because the whole board collapses if offering a seat costs you something. It also fixes the trust problem: the seat is paid for, so people stop not showing up.",
  },
  {
    line: "Regional partners",
    price: "season 2 onward",
    body: "Ski areas, rental shops and huts pay to reach people who are going there tomorrow. Delivered as an offer inside the feed attached to a specific ride, not as a banner.",
  },
  {
    line: "Season Pass",
    price: "14.99 € once per season",
    body: "December to April. Powder alerts and extended stats. A small line, not the model.",
  },
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
        {/* ── Head ─────────────────────────────────────────── */}
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
          <Link
            href="/demo"
            className="card-tap font-display px-5 py-3 text-lg uppercase"
            style={{
              background: RUST,
              color: PAPER,
              border: "var(--rule-thick)",
              boxShadow: "var(--shadow-print)",
            }}
          >
            Try the prototype
          </Link>
          <a
            href={REPO}
            className="card-tap font-display px-5 py-3 text-lg uppercase"
            style={{
              background: PAPER,
              color: INK,
              border: "var(--rule-thick)",
              boxShadow: "var(--shadow-print)",
            }}
          >
            Read the code
          </a>
          <span className="w-full text-sm sm:w-auto" style={{ color: INK_2 }}>
            Built by Philipp Fuchs, 17, Saarbrücken
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
          Snowmate is not a tracking app like Strava, not a location map like
          Snapchat, and not another social feed engineered to hold your
          attention. The big platforms are built to keep you scrolling.
          Snowmate is built to get you off your phone and onto the mountain
          with the right people. It is the coordination layer of the day, and
          it is crew-first.
        </p>

        {/* ── Product ──────────────────────────────────────── */}
        <Rule label="The product" num="02" />
        <p className="mb-8 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_2 }}>
          The interface is English. Riding vocabulary already is, and the
          first users include Erasmus students and seasonal workers who do
          not speak German. A German localisation is needed before a real
          launch in Austria, and it does not exist yet. Every screen is
          clickable in the{" "}
          <Link href="/demo" className="underline" style={{ color: RUST }}>
            prototype
          </Link>
          , running on sample data.
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

        {/* ── Business model ───────────────────────────────── */}
        <Rule label="Business model" num="04" />
        <p className="max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          Coordination stays free. All of it: feed, map, carpool board, crew,
          public events. A coordination tool is worthless if half your crew is
          behind a paywall, so charging for it would break the product before
          it earned anything. The money comes from transactions that already
          happen today, badly.
        </p>
        <div className="mt-6" style={{ borderTop: "var(--rule-thin)" }}>
          {REVENUE.map(({ line, price, body, lead }) => (
            <div
              key={line}
              className="py-4"
              style={{ borderBottom: "1px solid var(--border-hairline)" }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="text-mono-label px-2 py-0.5"
                  style={{
                    background: lead ? "var(--ochre)" : "var(--paper-2)",
                    color: INK,
                  }}
                >
                  {price}
                </span>
                <span className="text-[0.9375rem] font-semibold" style={{ color: INK }}>
                  {line}
                </span>
                {lead && (
                  <span className="text-mono-label" style={{ color: RUST }}>
                    main driver
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          The logic is that these people already spend money on the mountain.
          They buy a season pass, they split fuel in a group chat, they wire
          280 € to a club treasurer. None of that needs to be created, only
          handled properly. That is also why a percentage of a trip beats a
          subscription: it scales with something that is already moving.
        </p>

        {/* ── Craft ────────────────────────────────────────── */}
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

        {/* ── Founder note ────────────────────────────────── */}
        <Rule label="Who is building this" num="06" />
        <div
          className="px-5 py-5"
          style={{ background: PAPER_1, border: "var(--rule-thick)", boxShadow: "var(--shadow-print)" }}
        >
          <p className="max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
            I am Philipp Fuchs, 17, from Saarbrücken, Germany. I am still in
            school: Gymnasium am Schloss, Abitur expected 2027, currently
            averaging 1.4 on the German scale where 1.0 is the top mark.
          </p>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
            Alongside that I run a registered business for web
            design, video editing and motion design. I filed it before I was
            old enough to sign the paperwork on my own. Snowmate is the
            product I build on the side.
          </p>

          <div className="mt-6" style={{ borderTop: "var(--rule-thin)" }}>
            {EXPERIENCE.map(([year, what], i) => (
              <div
                key={what}
                className="flex flex-wrap items-baseline gap-x-3 py-2.5"
                style={{ borderBottom: i < EXPERIENCE.length - 1 ? "1px solid var(--border-hairline)" : "none" }}
              >
                <span className="text-mono-label flex-shrink-0" style={{ color: RUST, minWidth: 52 }}>
                  {year}
                </span>
                <span className="flex-1 text-sm leading-relaxed" style={{ color: INK_1 }}>
                  {what}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
            Snowmate is not my first attempt at this. PeakBuddy was an
            earlier ski-app concept I worked through at the Bocconi
            entrepreneurship lab, and FixItNow was a tradesperson-matching
            platform I dropped once I understood the marketplace problem.
            Snowmate is the first one I have taken far enough to hand someone
            a link.
          </p>
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
            I build with heavy AI pairing. What I own is the product thinking,
            the architecture rules, the design direction and every call about
            what does not get shipped. The commits are public, so judge the
            decisions.
          </p>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <a href={REPO} className="text-mono-label underline" style={{ color: RUST }}>
              GitHub
            </a>
            <a href={LINKEDIN} className="text-mono-label underline" style={{ color: RUST }}>
              LinkedIn
            </a>
          </div>
        </div>

        <p className="mt-14 text-mono-label" style={{ color: INK_2 }}>
          Snowmate · Prototype · Not accepting sign-ups yet
        </p>
      </div>
    </main>
  );
}

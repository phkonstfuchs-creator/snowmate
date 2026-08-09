import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PenguinMascot from "@/components/PenguinMascot";

/* Öffentliche Startseite. Bewusst eine ehrliche Fallstudie statt
   einer Marketingseite: Sie führt nirgends in den Login, weil
   hinter dem Login noch Beispieldaten liegen. Die App selbst
   bleibt unter /onboarding erreichbar. */

export const metadata: Metadata = {
  title: "Snowmate: coordinating ski days in Innsbruck and Salzburg",
  description:
    "A mobile web app that replaces scattered WhatsApp groups for young skiers in Austria. Honest build status included.",
};

const REPO = "https://github.com/phkonstfuchs-creator/snowmate";
const LINKEDIN = "https://www.linkedin.com/in/philipp-k-fuchs";

/* Jahr + Sache. Konkret statt blumig — die Fakten tragen sich
   selbst, Adjektive wuerden sie nur verwaessern. */
const EXPERIENCE: [string, string][] = [
  [
    "Aug 2026",
    "Silicon Valley Technology and Management Program at San José State University, in the Bay Area.",
  ],
  [
    "2026",
    "Korea Tech & AI Founders Program, a cross-border founder track. German cohort in Saarbrücken, Korean cohort this autumn.",
  ],
  [
    "Jul 2026",
    "Bocconi Summer School, Entrepreneurship Lab in Milan.",
  ],
  [
    "2025",
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
  ["map", "Map", "All resorts in the region, with riders split by riding style, not just a headcount."],
  ["carpool", "Carpool", "Two-sided board: drivers offer seats, riders ask for one."],
  ["crew", "Crew", "Friends, requests and chats that are attached to a ride or a carpool."],
  ["profile", "Profile", "Season record: days, resorts, streak, stamps and a regional ranking."],
];

/* Zeilen bewusst als Daten, damit Status und Begründung nicht
   auseinanderlaufen koennen */
const STATUS: [string, "live" | "mock" | "next" | "later", string][] = [
  ["Sign-up, e-mail confirmation, sign-in, sign-out", "live", "Supabase, server-side sessions, protected routes"],
  ["Row Level Security on the profile shell", "live", "with negative policy tests (pgTAP)"],
  ["Feed, Map, Carpool, Crew, Profile", "mock", "rendered from a local fixture file, no database behind them"],
  ["Meeting-point visibility rule", "mock", "promised in the UI, not enforced on the server yet"],
  ["Onboarding answers (region, style, name)", "mock", "written to browser storage and never read back"],
  ["Rides, crews and chats on a real schema", "next", "needs tables, RLS and negative tests first"],
  ["Snow depth and fresh-snow alerts", "next", "Open-Meteo covers this: verified, free, no key"],
  ["Lift status per resort", "next", "no single free source; per-resort feeds or community input"],
  ["Vertical metres, heatmaps", "later", "needs a native app, because iOS suspends background JS in a PWA"],
];

/* Preis und Begruendung getrennt, damit die Zahlen nicht in
   Fliesstext verschwinden */
const PRICING: [string, string, string][] = [
  ["Free", "Feed, carpool board, crew, chats", "Everything needed to actually meet up. This part stays free, because a coordination tool is worthless if half your crew is behind a paywall."],
  ["Premium", "2.99 € per month", "Aerial map view, fresh-snow alerts, deeper season stats, a premium stamp on your profile."],
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

        {/* ── Produkt ──────────────────────────────────────── */}
        <Rule label="The product" num="02" />
        <p className="mb-8 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_2 }}>
          Riding vocabulary stays English throughout, because that is how
          this crowd actually speaks. All five screens are clickable in the{" "}
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

        {/* ── Geschäftsmodell ──────────────────────────────── */}
        <Rule label="Business model" num="04" />
        <div style={{ borderTop: "var(--rule-thin)" }}>
          {PRICING.map(([tier, price, body]) => (
            <div
              key={tier}
              className="py-4"
              style={{ borderBottom: "1px solid var(--border-hairline)" }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span
                  className="text-mono-label px-2 py-0.5"
                  style={{
                    background: tier === "Premium" ? "var(--ochre)" : "var(--paper-2)",
                    color: INK,
                    minWidth: 88,
                    textAlign: "center",
                  }}
                >
                  {tier}
                </span>
                <span className="text-[0.9375rem] font-semibold" style={{ color: INK }}>
                  {price}
                </span>
              </div>
              <p className="mt-2 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_1 }}>
          The maths is deliberately unromantic. There are roughly 13 ski areas
          on one pass around Innsbruck alone, and the people I am building for
          already pay for a season pass, so the willingness to pay for the
          mountain exists. At 2.99 € a month, this only works on volume within
          a region, which is why the plan is to win one valley properly before
          touching a second.
        </p>
        <p className="mt-4 max-w-[58ch] text-sm leading-relaxed" style={{ color: INK_2 }}>
          To be clear about the status: nobody is paying yet. There is no
          payment integration, no revenue and no paying user. The pricing is a
          hypothesis, not a result.
        </p>

        {/* ── Haltung ──────────────────────────────────────── */}
        <Rule label="Why I am not shipping faster" num="05" />
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
        <Rule label="How it is built" num="06" />
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
        <Rule label="Who is building this" num="07" />
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
            Alongside that I run a registered sole proprietorship for web
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

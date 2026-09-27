"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Icon from "@/components/ui/Icon";

/* Events sits far forward on purpose: a new user has an empty feed,
   and then the way in without friends has to be immediately visible.
   Six destinations is one above the usual ceiling — the price of
   keeping carpool its own surface. */
const TABS = [
  { href: "/feed", label: "Today", icon: "flame" },
  { href: "/events", label: "Events", icon: "calendar-days" },
  { href: "/map", label: "Map", icon: "map-pinned" },
  { href: "/carpool", label: "Carpool", icon: "car" },
  { href: "/crew", label: "Crew", icon: "users" },
  { href: "/profile", label: "Profile", icon: "user" },
];

/* Destinations without their own tab. Without this mapping nothing
   in the bar lights up once you are on /people. */
const OWNED_BY: Record<string, string> = {
  "/people": "/crew",
};

/* basePath lets the same bar serve the clickable demo under /demo
   without duplicating the destinations. */
/* badges: count of things waiting for the user, keyed by tab href. */
export default function BottomNav({
  basePath = "",
  badges = {},
}: {
  basePath?: string;
  badges?: Partial<Record<string, number>>;
}) {
  const pathname = usePathname();
  const route = basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length) || "/"
    : pathname;
  const ownerTab = Object.entries(OWNED_BY).find(([child]) =>
    route === child || route.startsWith(`${child}/`),
  )?.[1];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const href = `${basePath}${tab.href}`;
          const badge = badges[tab.href] ?? 0;
          const isActive = ownerTab
            ? ownerTab === tab.href
            : route === tab.href || route.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-3 min-h-[56px] transition-colors duration-150"
              style={{ color: isActive ? "var(--rust)" : "var(--ink-2)" }}
              aria-current={isActive ? "page" : undefined}
              aria-label={badge > 0 ? `${tab.label}, ${badge} waiting` : undefined}
            >
              <span className="transition-transform duration-150" style={{ transform: isActive ? "translateY(-1px)" : "none" }}>
                <Icon name={tab.icon} size={22} strokeWidth={isActive ? 2.3 : 1.8} />
              </span>
              {badge > 0 && (
                <span
                  aria-hidden="true"
                  className="text-mono-label absolute top-1.5 flex h-4 min-w-4 items-center justify-center px-1"
                  style={{ left: "calc(50% + 6px)", background: "var(--rust)", color: "var(--paper-0)", fontSize: "0.6rem", lineHeight: 1 }}
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              <span className={clsx(
                "text-[0.6875rem] leading-none",
                isActive ? "font-black" : "font-bold"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <span
                  className="absolute inset-x-0 top-0"
                  style={{ height: 3, background: "var(--rust)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

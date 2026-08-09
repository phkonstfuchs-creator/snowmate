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
export default function BottomNav({ basePath = "" }: { basePath?: string }) {
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
            >
              <span className="transition-transform duration-150" style={{ transform: isActive ? "translateY(-1px)" : "none" }}>
                <Icon name={tab.icon} size={22} strokeWidth={isActive ? 2.3 : 1.8} />
              </span>
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

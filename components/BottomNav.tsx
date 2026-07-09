"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Icon from "@/components/ui/Icon";

const TABS = [
  { href: "/feed", label: "Today", icon: "flame" },
  { href: "/map", label: "Map", icon: "map-pinned" },
  { href: "/carpool", label: "Carpool", icon: "car" },
  { href: "/crew", label: "Crew", icon: "users" },
  { href: "/profile", label: "Profile", icon: "user" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-3 min-h-[56px] transition-colors duration-150"
              style={{ color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)" }}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="transition-transform duration-150" style={{ transform: isActive ? "translateY(-1px)" : "none" }}>
                <Icon name={tab.icon} size={22} strokeWidth={isActive ? 2.3 : 1.8} />
              </span>
              <span className={clsx(
                "text-[0.6875rem] leading-none tracking-wide",
                isActive ? "font-black opacity-100" : "font-bold opacity-60"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 w-5 h-0.5 rounded-full"
                  style={{ bottom: "env(safe-area-inset-bottom, 4px)", background: "var(--accent-primary)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

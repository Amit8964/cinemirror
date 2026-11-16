"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/titles", label: "Titles" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/dmca", label: "DMCA" },
];

/** `badges` maps an item href to a count shown next to it (e.g. new DMCA notices). */
export default function AdminNav({ badges = {} }: { badges?: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 lg:flex-col">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-accent/15 text-accent" : "text-muted hover:bg-raised hover:text-text"
            }`}
          >
            {item.label}
            {(badges[item.href] ?? 0) > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[11px] leading-5 font-extrabold text-accent-ink">{badges[item.href]}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

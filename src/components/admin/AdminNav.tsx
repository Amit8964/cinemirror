"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/titles", label: "Titles" },
  { href: "/admin/partners", label: "Partners" },
];

export default function AdminNav() {
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
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-accent/15 text-accent" : "text-muted hover:bg-raised hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

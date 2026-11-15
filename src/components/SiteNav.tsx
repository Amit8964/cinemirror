"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookmarkIcon, ChevronDownIcon, FilmIcon, HomeIcon, SearchIcon, TvIcon } from "./icons";

export const NAV_LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
];

const MAIN = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/discover", label: "Movies", icon: FilmIcon, match: (p: string) => p.startsWith("/discover") || p.startsWith("/movie") },
  { href: "/series", label: "Web Series", icon: TvIcon, match: (p: string) => p.startsWith("/series") },
  { href: "/browse", label: "Library", icon: FilmIcon, match: (p: string) => p.startsWith("/browse") || p.startsWith("/title") },
  { href: "/my-list", label: "My List", icon: BookmarkIcon, match: (p: string) => p.startsWith("/my-list") },
];

export function SiteNav({ logo }: { logo: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [solid, setSolid] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [langOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          solid ? "border-b border-white/5 bg-ink/95 backdrop-blur-md" : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-6 px-4 sm:px-8">
          <Link href="/" aria-label="CineMirror home" className="shrink-0">{logo}</Link>

          <nav className="hidden items-center gap-1 text-sm font-semibold lg:flex" aria-label="Main">
            {MAIN.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.match(pathname) ? "page" : undefined}
                className={`rounded-md px-3 py-2 transition ${item.match(pathname) ? "text-text" : "text-text/65 hover:text-text"}`}
              >
                {item.label}
              </Link>
            ))}
            <div ref={langRef} className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                aria-expanded={langOpen}
                aria-haspopup="true"
                className="flex items-center gap-1 rounded-md px-3 py-2 text-text/65 transition hover:text-text"
              >
                Languages <ChevronDownIcon className={`transition ${langOpen ? "rotate-180" : ""}`} />
              </button>
              {langOpen && (
                <div onClick={() => setLangOpen(false)} className="absolute top-full left-0 mt-2 grid w-80 grid-cols-2 gap-1 rounded-xl border border-line bg-surface/98 p-3 shadow-2xl shadow-black/60">
                  <p className="col-span-2 px-2 pb-1 text-[11px] font-bold tracking-widest text-muted uppercase">Movies</p>
                  {NAV_LANGUAGES.map((l) => (
                    <Link key={`m-${l.code}`} href={`/discover?lang=${l.code}`} className="rounded-md px-2 py-1.5 text-sm text-text/80 hover:bg-raised hover:text-text">
                      {l.label}
                    </Link>
                  ))}
                  <p className="col-span-2 mt-2 px-2 pb-1 text-[11px] font-bold tracking-widest text-muted uppercase">Web Series</p>
                  {NAV_LANGUAGES.slice(0, 6).map((l) => (
                    <Link key={`s-${l.code}`} href={`/series?lang=${l.code}`} className="rounded-md px-2 py-1.5 text-sm text-text/80 hover:bg-raised hover:text-text">
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <form action="/discover" className="relative ml-auto hidden w-full max-w-xs md:block" role="search">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              placeholder="Movies, series, actors…"
              aria-label="Search"
              className="field !rounded-full !border-white/10 !bg-black/40 !py-2 !pl-9 backdrop-blur"
            />
          </form>
          <Link
            href="/discover#search"
            aria-label="Search"
            className="ml-auto grid h-10 w-10 place-items-center rounded-full text-xl text-text/80 hover:bg-white/10 md:hidden"
          >
            <SearchIcon />
          </Link>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {MAIN.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-accent" : "text-muted"}`}
                >
                  <Icon className="text-xl" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

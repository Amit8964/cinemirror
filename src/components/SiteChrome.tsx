import Link from "next/link";
import { HOSTING_NOTICE, SITE, TMDB_NOTICE, currentYear, telHref } from "@/lib/site";
import { FlagIcon, MailIcon, PhoneIcon, ShieldIcon } from "./icons";
import { SiteNav } from "./SiteNav";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-3xl leading-none tracking-wide ${className}`}>
      CINE<span className="text-accent">MIRROR</span>
    </span>
  );
}

export function SiteHeader() {
  return <SiteNav logo={<Logo />} />;
}

type FooterLink = { href: string; label: string };

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Browse",
    links: [
      { href: "/discover", label: "Movies" },
      { href: "/series", label: "Web Series" },
      { href: "/discover?cat=trending", label: "Trending" },
      { href: "/discover?cat=now_playing", label: "In Cinemas" },
      { href: "/browse", label: "Library" },
      { href: "/my-list", label: "My List" },
    ],
  },
  {
    title: "Popular genres",
    links: [
      { href: "/discover?genre=28", label: "Action Movies" },
      { href: "/discover?genre=35", label: "Comedy Movies" },
      { href: "/discover?genre=27", label: "Horror Movies" },
      { href: "/discover?genre=10749", label: "Romance Movies" },
      { href: "/discover?genre=878", label: "Sci-Fi Movies" },
      { href: "/discover?genre=18", label: "Drama Movies" },
    ],
  },
  {
    title: "Languages",
    links: [
      { href: "/discover?lang=hi", label: "Bollywood" },
      { href: "/discover?lang=en", label: "Hollywood" },
      { href: "/discover?lang=te", label: "Telugu" },
      { href: "/discover?lang=ta", label: "Tamil" },
      { href: "/discover?lang=ko", label: "Korean" },
      { href: "/series?lang=ko", label: "K-Dramas" },
    ],
  },
  {
    title: "Help & legal",
    links: [
      { href: "/dmca", label: "DMCA / Report" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-gradient-to-b from-surface/60 to-ink pb-20 lg:pb-0">
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_3fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Discover trending movies and web series in one place. Fast, clean and free to browse.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 text-text/80 hover:text-accent">
                  <MailIcon className="text-accent" /> {SITE.email}
                </a>
              </li>
              <li>
                <a href={telHref(SITE.phone)} className="inline-flex items-center gap-2 text-text/80 hover:text-accent">
                  <PhoneIcon className="text-accent" /> {SITE.phone}
                </a>
              </li>
            </ul>
            <Link href="/dmca" className="btn btn-ghost mt-5 !py-2 !text-xs">
              <FlagIcon className="text-accent" /> Report content
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="text-[11px] font-bold tracking-[0.18em] text-text uppercase">{col.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-muted transition-colors hover:text-accent">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex gap-3 rounded-xl border border-line bg-surface/70 p-4 text-xs leading-relaxed text-muted">
          <ShieldIcon className="mt-0.5 shrink-0 text-base text-accent" />
          <p>
            <span className="font-semibold text-text/90">Disclaimer: </span>
            {HOSTING_NOTICE}{" "}
            <Link href="/disclaimer" className="font-semibold text-accent hover:underline">Read more</Link>
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear()} {SITE.name}. Movie data &amp; images from TMDB. {TMDB_NOTICE}
          </p>
          <nav aria-label="Legal" className="flex shrink-0 gap-4 font-semibold">
            <Link href="/dmca" className="hover:text-text">DMCA</Link>
            <Link href="/disclaimer" className="hover:text-text">Disclaimer</Link>
            <Link href="/contact" className="hover:text-text">Contact</Link>
            <Link href="/admin" className="hover:text-text">Admin</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

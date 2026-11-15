import Link from "next/link";
import { SearchIcon } from "./icons";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-3xl leading-none tracking-wide ${className}`}>
      MOVIE<span className="text-accent">HUB</span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <Link href="/" aria-label="MovieHub home"><Logo /></Link>
        <nav className="flex items-center gap-4 text-sm font-semibold whitespace-nowrap text-muted sm:gap-6">
          <Link href="/" className="hidden hover:text-text sm:block">Home</Link>
          <Link href="/browse" className="hover:text-text">Browse</Link>
          <Link href="/my-list" className="hover:text-text">My List</Link>
        </nav>
        <form action="/browse" className="relative ml-auto hidden w-full max-w-xs sm:block">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            placeholder="Search films"
            aria-label="Search films"
            className="field !rounded-full !bg-surface !py-2 !pl-9"
          />
        </form>
        <Link
          href="/browse#search"
          aria-label="Search films"
          className="ml-auto grid h-10 w-10 place-items-center rounded-full text-xl text-muted hover:bg-raised hover:text-text sm:hidden"
        >
          <SearchIcon />
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo className="!text-2xl" />
          <p className="mt-1 max-w-md">
            Only openly licensed, public-domain or rights-cleared films are streamed here. Credits are listed on each title.
          </p>
        </div>
        <nav className="flex gap-5 font-semibold">
          <Link href="/browse" className="hover:text-text">Browse</Link>
          <Link href="/my-list" className="hover:text-text">My List</Link>
          <Link href="/admin" className="hover:text-text">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}

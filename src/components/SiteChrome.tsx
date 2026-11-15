import Link from "next/link";
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

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/5 pb-16 lg:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo className="!text-2xl" />
          <p className="mt-1 max-w-md">
            Only openly licensed, public-domain or rights-cleared films are streamed here. Credits are listed on each title.
          </p>
        </div>
        <nav className="flex gap-5 font-semibold">
          <Link href="/discover" className="hover:text-text">Movies</Link>
          <Link href="/series" className="hover:text-text">Web Series</Link>
          <Link href="/browse" className="hover:text-text">Library</Link>
          <Link href="/my-list" className="hover:text-text">My List</Link>
          <Link href="/admin" className="hover:text-text">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}

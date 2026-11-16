import Link from "next/link";
import type { CSSProperties } from "react";
import { preconnect } from "react-dom";
import { resolveStreams } from "@/lib/stream-status";
import { posterSrcSet, type TmdbMovie } from "@/lib/tmdb";
import { hueFor } from "@/lib/util";

// Server component: renders plain HTML + CSS and ships no JavaScript to the browser.
// Images are sized responsively (srcset), lazy below the fold and reserve their space (no layout shift).

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Width each card gets at each breakpoint, so the browser downloads the lightest poster that stays sharp. */
const SIZES = "(min-width: 1280px) 210px, (min-width: 1024px) 19vw, (min-width: 640px) 31vw, 46vw";

export const GRID_COLUMNS = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6";

export default async function MovieGrid({
  movies: allMovies, basePath = "/movie", rankFrom, eager = 0, columns = GRID_COLUMNS, className = "",
}: {
  movies: TmdbMovie[];
  /** Cards link to `${basePath}/${id}`. */
  basePath?: string;
  /** Show rank numbers starting at this value (e.g. 1 for a top-10). */
  rankFrom?: number;
  /** How many leading posters load immediately (above the fold); the rest are lazy. */
  eager?: number;
  columns?: string;
  className?: string;
}) {
  if (!allMovies.length) return null;
  preconnect("https://image.tmdb.org");
  // Released titles with no stream are left out; upcoming ones stay and say "Coming soon".
  let movies = allMovies;
  const status = await resolveStreams("movie", movies.map((m) => ({ id: m.id, title: m.title, year: m.year, date: m.releaseDate })));
  movies = movies.filter((m) => status.get(m.id) !== "hide");
  if (!movies.length) return null;

  return (
    <ul role="list" className={`grid gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 ${columns} ${className}`}>
      {movies.map((m, i) => (
        <li key={m.id}>
          <MovieCard
            movie={m}
            href={`${basePath}/${m.id}`}
            rank={rankFrom !== undefined ? rankFrom + i : undefined}
            eager={i < eager}
            available={status.get(m.id) === "watch"}
          />
        </li>
      ))}
    </ul>
  );
}

function MovieCard({ movie: m, href, rank, eager, available }: { movie: TmdbMovie; href: string; rank?: number; eager: boolean; available: boolean }) {
  const hue = hueFor(m.title);
  // Playable here → "Watch now"; poster only, no stream yet → "Coming soon".
  const badge = available ? { label: "Watch now", className: "bg-accent text-accent-ink" } : { label: "Coming soon", className: "bg-white/90 text-ink" };
  const date = m.releaseDate ? dateFmt.format(new Date(`${m.releaseDate}T00:00:00Z`)) : m.year ? String(m.year) : "";
  const overview = m.overview.length > 150 ? `${m.overview.slice(0, 150).trimEnd()}…` : m.overview;

  return (
    <Link href={href} className="mg-card group block rounded-xl focus-visible:outline-none">
      <div
        className="mg-poster relative aspect-[2/3] overflow-hidden rounded-xl"
        style={{ backgroundImage: `linear-gradient(155deg, hsl(${hue} 55% 30%), hsl(${(hue + 50) % 360} 60% 12%) 70%)` }}
      >
        {/* Fallback art: visible while the poster loads or if it fails */}
        <span aria-hidden="true" className="absolute inset-x-3 bottom-3 font-display text-2xl leading-[0.95] tracking-wide text-white/90 [text-wrap:balance]">
          {m.title}
        </span>

        {m.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.posterUrl}
            srcSet={posterSrcSet(m.posterUrl)}
            sizes={SIZES}
            width={342}
            height={513}
            alt=""
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            className="mg-img absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/30" />

        {badge && (
          <span className={`absolute top-2.5 left-2.5 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${badge.className}`}>
            {badge.label}
          </span>
        )}

        {m.rating > 0 && <RatingRing value={m.rating} />}

        {rank !== undefined && (
          <span aria-label={`Rank ${rank}`} className={`mg-rank absolute bottom-1 left-2.5 font-display text-6xl leading-none sm:text-7xl ${rank <= 3 ? "mg-rank-top" : ""}`}>
            {rank}
          </span>
        )}

        {overview && (
          <div className="mg-reveal absolute inset-x-0 bottom-0 hidden p-3 pt-10 sm:block">
            <p className="line-clamp-4 text-xs leading-relaxed text-white/85">{overview}</p>
            <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-ink">
              View details
            </span>
          </div>
        )}
      </div>

      <h3 className="mt-2.5 truncate text-sm font-semibold text-text transition-colors group-hover:text-accent">{m.title}</h3>
      {date && (
        <p className="mt-0.5 truncate text-xs text-muted">
          <time dateTime={m.releaseDate || undefined}>{date}</time>
        </p>
      )}
    </Link>
  );
}

/** TMDB-style score ring drawn with a CSS conic gradient (no SVG, no JS). */
function RatingRing({ value }: { value: number }) {
  const color = value >= 7 ? "var(--color-ok)" : value >= 5 ? "var(--color-accent)" : "var(--color-danger)";
  return (
    <span
      className="mg-ring absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full text-[11px] font-extrabold text-white"
      style={{ "--p": Math.round(value * 10), "--rc": color } as CSSProperties}
      title={`Rated ${value.toFixed(1)} / 10 on TMDB`}
    >
      {value.toFixed(1)}
    </span>
  );
}


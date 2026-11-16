import Link from "next/link";
import ContinueWatching from "@/components/ContinueWatching";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import MovieGrid from "@/components/MovieGrid";
import Shelf, { ShelfItem } from "@/components/Shelf";
import TitleCard from "@/components/TitleCard";
import { resolveStreams } from "@/lib/stream-status";
import { listTitles, toCard, trendingSlugs } from "@/lib/titles";
import {
  discoverByLanguage, discoverTv, getTrendingMovies, listCategory, listTv, showToCard, tmdbEnabled, tmdbToCard,
  type TmdbMovie, type TmdbShow,
} from "@/lib/tmdb";
import type { Title } from "@/lib/types";
import { formatDuration } from "@/lib/util";

const seeAll = (href: string) => (
  <Link href={href} className="text-sm font-semibold text-muted hover:text-accent">See all</Link>
);

export default async function HomePage() {
  const titles = await listTitles();
  const tmdb = tmdbEnabled();

  if (!titles.length && !tmdb) {
    return (
      <div className="mx-auto max-w-xl px-6 py-28 text-center">
        <h1 className="font-display text-5xl tracking-wide">Nothing to watch yet</h1>
        <p className="mt-3 text-muted">Add your first film from the admin panel and it will appear here.</p>
        <Link href="/admin/titles/new" className="btn btn-primary mt-6">Add a film</Link>
      </div>
    );
  }

  const bySlug = new Map(titles.map((t) => [t.slug, t]));
  const [trendingLib, rows] = await Promise.all([
    trendingSlugs().then((s) => s.map((x) => bySlug.get(x)).filter((t): t is Title => !!t)),
    loadTmdbRows(tmdb),
  ]);

  // Released titles with no stream are left out of every row; upcoming ones stay and say "Coming soon".
  const uniq = <T extends { id: number }>(list: T[]) => [...new Map(list.map((x) => [x.id, x])).values()];
  const [mst, tst] = await Promise.all([
    resolveStreams("movie", uniq([...rows.heroMovies, ...rows.movies.flatMap((r) => r.items)]).map((m) => ({ id: m.id, title: m.title, year: m.year, date: m.releaseDate }))),
    resolveStreams("tv", uniq(rows.series.flatMap((r) => r.items)).map((s) => ({ id: s.id, title: s.name, year: s.year, date: s.firstAirDate }))),
  ]);
  const movieRows = rows.movies.map((r) => ({ ...r, items: r.items.filter((m) => mst.get(m.id) !== "hide") })).filter((r) => r.items.length >= 3);
  const seriesRows = rows.series.map((r) => ({ ...r, items: r.items.filter((x) => tst.get(x.id) !== "hide") })).filter((r) => r.items.length >= 3);
  const heroMovies = rows.heroMovies.filter((m) => mst.get(m.id) !== "hide");

  const genreCount = new Map<string, number>();
  titles.forEach((t) => t.genres.forEach((g) => genreCount.set(g, (genreCount.get(g) ?? 0) + 1)));
  const genres = [...genreCount.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="-mt-16">
      <HeroCarousel slides={buildSlides(titles, heroMovies)} />

      <div className="relative z-10 -mt-10 sm:-mt-16">
        <ContinueWatching available={titles.map((t) => t.slug)} />

        {titles.length > 0 && (
          <Shelf title="Watch now on CineMirror" action={seeAll("/browse")}>
            {titles.slice(0, 16).map((t) => <ShelfItem key={t.id}><TitleCard card={toCard(t)} /></ShelfItem>)}
          </Shelf>
        )}
        {trendingLib.length >= 3 && (
          <Shelf title="Most watched here">
            {trendingLib.map((t) => <ShelfItem key={t.id}><TitleCard card={toCard(t)} /></ShelfItem>)}
          </Shelf>
        )}

        {rows.trendingToday.length >= 6 && (
          <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-accent uppercase">Trending today</p>
                <h2 className="font-display text-3xl tracking-wide sm:text-4xl">Top 10 movies right now</h2>
              </div>
              {seeAll("/discover?cat=trending")}
            </div>
            {/* 6 cards on phones, 9 on tablets, all 10 on desktop — always full rows */}
            <MovieGrid
              movies={rows.trendingToday}
              rankFrom={1}
              columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-sm:[&>li:nth-child(n+7)]:hidden sm:max-lg:[&>li:nth-child(n+10)]:hidden"
              className="mt-5"
            />
          </section>
        )}

        {movieRows.map((r) => (
          <Shelf key={r.title} title={r.title} action={seeAll(r.href)}>
            {r.items.map((m) => (
              <ShelfItem key={m.id}><TitleCard card={tmdbToCard(m)} href={`/movie/${m.id}`} rating={m.rating} comingSoon={mst.get(m.id) !== "watch"} /></ShelfItem>
            ))}
          </Shelf>
        ))}

        {seriesRows.map((r) => (
          <Shelf key={r.title} title={r.title} action={seeAll(r.href)}>
            {r.items.map((s) => (
              <ShelfItem key={s.id}><TitleCard card={showToCard(s)} href={`/series/${s.id}`} rating={s.rating} comingSoon={tst.get(s.id) !== "watch"} /></ShelfItem>
            ))}
          </Shelf>
        ))}

        {genres.map(([genre]) => (
          <Shelf key={genre} title={`${genre} in the library`} action={seeAll(`/browse?genre=${encodeURIComponent(genre)}`)}>
            {titles.filter((t) => t.genres.includes(genre)).map((t) => (
              <ShelfItem key={t.id}><TitleCard card={toCard(t)} /></ShelfItem>
            ))}
          </Shelf>
        ))}
      </div>
    </div>
  );
}

function buildSlides(titles: Title[], heroMovies: TmdbMovie[]): HeroSlide[] {
  const featured = titles.filter((t) => t.featured && t.backdropUrl);
  const lib = (featured.length ? featured : titles.filter((t) => t.backdropUrl)).slice(0, 3).map<HeroSlide>((t) => ({
    key: `lib-${t.id}`,
    kicker: "Now streaming",
    title: t.title,
    overview: t.description,
    backdropUrl: t.backdropUrl,
    meta: [t.year ? String(t.year) : "", t.rating, formatDuration(t.durationMin), t.genres.slice(0, 2).join(" · ")].filter(Boolean),
    playHref: `/watch/${t.slug}`,
    infoHref: `/title/${t.slug}`,
  }));
  const libNames = new Set(titles.map((t) => t.title.toLowerCase()));
  const libSlug = new Map(titles.map((t) => [t.title.toLowerCase(), t.slug]));
  const tmdb = heroMovies
    .filter((m) => m.backdropUrl)
    .slice(0, 6 - lib.length)
    .map<HeroSlide>((m) => ({
      key: `tmdb-${m.id}`,
      kicker: "Trending this week",
      title: m.title,
      overview: m.overview,
      backdropUrl: m.backdropUrl,
      rating: m.rating || undefined,
      meta: [m.year ? String(m.year) : ""].filter(Boolean),
      playHref: libNames.has(m.title.toLowerCase()) ? `/watch/${libSlug.get(m.title.toLowerCase())}` : undefined,
      infoHref: `/movie/${m.id}`,
    }));
  return [...lib, ...tmdb];
}

type Row<T> = { title: string; href: string; items: T[] };

async function loadTmdbRows(enabled: boolean): Promise<{
  heroMovies: TmdbMovie[]; trendingToday: TmdbMovie[]; movies: Row<TmdbMovie>[]; series: Row<TmdbShow>[];
}> {
  if (!enabled) return { heroMovies: [], trendingToday: [], movies: [], series: [] };
  const movieDefs = [
    { title: "Latest Bollywood", href: "/discover?lang=hi", load: () => discoverByLanguage("hi") },
    { title: "In cinemas now", href: "/discover?cat=now_playing", load: () => listCategory("now_playing") },
    { title: "South Indian hits", href: "/discover?lang=te", load: () => discoverByLanguage("te") },
    { title: "Tamil cinema", href: "/discover?lang=ta", load: () => discoverByLanguage("ta") },
    { title: "Korean movies", href: "/discover?lang=ko", load: () => discoverByLanguage("ko") },
    { title: "All-time top rated", href: "/discover?cat=top_rated", load: () => listCategory("top_rated") },
  ];
  const seriesDefs = [
    { title: "Trending web series", href: "/series?cat=trending", load: () => listTv("trending") },
    { title: "Hindi web series", href: "/series?lang=hi", load: () => discoverTv({ lang: "hi" }) },
    { title: "K-dramas", href: "/series?lang=ko", load: () => discoverTv({ lang: "ko" }) },
    { title: "Top rated series", href: "/series?cat=top_rated", load: () => listTv("top_rated") },
  ];
  // Everything in parallel; each TMDB call is cached server-side, so this is near-instant after the first view.
  const [heroMovies, trendingToday, m, s] = await Promise.all([
    getTrendingMovies({ window: "week" }),
    getTrendingMovies({ window: "day", limit: 10 }),
    Promise.all(movieDefs.map((d) => d.load())),
    Promise.all(seriesDefs.map((d) => d.load())),
  ]);
  const movies = movieDefs.map((d, i) => ({ title: d.title, href: d.href, items: m[i] })).filter((r) => r.items.length >= 3);
  const series = seriesDefs.map((d, i) => ({ title: d.title, href: d.href, items: s[i] })).filter((r) => r.items.length >= 3);
  return { heroMovies, trendingToday, movies, series };
}

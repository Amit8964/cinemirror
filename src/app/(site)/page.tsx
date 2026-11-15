import Link from "next/link";
import ContinueWatching from "@/components/ContinueWatching";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import Shelf, { ShelfItem } from "@/components/Shelf";
import TitleCard from "@/components/TitleCard";
import { listTitles, toCard, trendingSlugs } from "@/lib/titles";
import {
  discoverByLanguage, discoverTv, listCategory, listTv, showToCard, tmdbEnabled, tmdbToCard,
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

  const genreCount = new Map<string, number>();
  titles.forEach((t) => t.genres.forEach((g) => genreCount.set(g, (genreCount.get(g) ?? 0) + 1)));
  const genres = [...genreCount.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="-mt-16">
      <HeroCarousel slides={buildSlides(titles, rows.heroMovies)} />

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

        {rows.movies.map((r) => (
          <Shelf key={r.title} title={r.title} action={seeAll(r.href)}>
            {r.items.map((m) => (
              <ShelfItem key={m.id}><TitleCard card={tmdbToCard(m)} href={`/movie/${m.id}`} rating={m.rating} /></ShelfItem>
            ))}
          </Shelf>
        ))}

        {rows.series.map((r) => (
          <Shelf key={r.title} title={r.title} action={seeAll(r.href)}>
            {r.items.map((s) => (
              <ShelfItem key={s.id}><TitleCard card={showToCard(s)} href={`/series/${s.id}`} rating={s.rating} /></ShelfItem>
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

async function loadTmdbRows(enabled: boolean): Promise<{ heroMovies: TmdbMovie[]; movies: Row<TmdbMovie>[]; series: Row<TmdbShow>[] }> {
  if (!enabled) return { heroMovies: [], movies: [], series: [] };
  const movieDefs = [
    { title: "Trending movies", href: "/discover?cat=trending", load: () => listCategory("trending") },
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
  const [m, s] = await Promise.all([
    Promise.all(movieDefs.map((d) => d.load())),
    Promise.all(seriesDefs.map((d) => d.load())),
  ]);
  const movies = movieDefs.map((d, i) => ({ title: d.title, href: d.href, items: m[i] })).filter((r) => r.items.length >= 3);
  const series = seriesDefs.map((d, i) => ({ title: d.title, href: d.href, items: s[i] })).filter((r) => r.items.length >= 3);
  // Interleave: two movie rows, one series row, …
  const out: { movies: Row<TmdbMovie>[]; series: Row<TmdbShow>[] } = { movies, series };
  return { heroMovies: m[0] ?? [], ...out };
}

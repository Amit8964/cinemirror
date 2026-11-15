import Link from "next/link";
import ContinueWatching from "@/components/ContinueWatching";
import { InfoIcon, PlayIcon } from "@/components/icons";
import Poster from "@/components/Poster";
import Shelf, { ShelfItem } from "@/components/Shelf";
import TitleCard from "@/components/TitleCard";
import { listTitles, toCard, trendingSlugs } from "@/lib/titles";
import { discoverByLanguage, listCategory, tmdbEnabled, tmdbToCard, type TmdbMovie } from "@/lib/tmdb";
import type { Title } from "@/lib/types";
import { formatDuration, hueFor } from "@/lib/util";

export default async function HomePage() {
  const titles = await listTitles();

  if (!titles.length) {
    return (
      <div className="mx-auto max-w-xl px-6 py-28 text-center">
        <h1 className="font-display text-5xl tracking-wide">Nothing to watch yet</h1>
        <p className="mt-3 text-muted">Add your first film from the admin panel and it will appear here.</p>
        <Link href="/admin/titles/new" className="btn btn-primary mt-6">Add a film</Link>
      </div>
    );
  }

  const hero = titles.find((t) => t.featured) ?? titles[0];
  const bySlug = new Map(titles.map((t) => [t.slug, t]));
  const trending = (await trendingSlugs()).map((s) => bySlug.get(s)).filter((t): t is Title => !!t);

  const genreCount = new Map<string, number>();
  titles.forEach((t) => t.genres.forEach((g) => genreCount.set(g, (genreCount.get(g) ?? 0) + 1)));
  const genres = [...genreCount.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const tmdbShelves = await loadTmdbShelves();

  return (
    <>
      <Hero title={hero} />
      <ContinueWatching available={titles.map((t) => t.slug)} />
      {trending.length >= 3 && (
        <Shelf title="Trending now">
          {trending.map((t) => <ShelfItem key={t.id}><TitleCard card={toCard(t)} /></ShelfItem>)}
        </Shelf>
      )}
      <Shelf title="New arrivals" action={<Link href="/browse" className="text-sm font-semibold text-muted hover:text-accent">See all</Link>}>
        {titles.slice(0, 14).map((t) => <ShelfItem key={t.id}><TitleCard card={toCard(t)} /></ShelfItem>)}
      </Shelf>
      {genres.map(([genre]) => (
        <Shelf
          key={genre}
          title={genre}
          action={<Link href={`/browse?genre=${encodeURIComponent(genre)}`} className="text-sm font-semibold text-muted hover:text-accent">See all</Link>}
        >
          {titles.filter((t) => t.genres.includes(genre)).map((t) => (
            <ShelfItem key={t.id}><TitleCard card={toCard(t)} /></ShelfItem>
          ))}
        </Shelf>
      ))}
      {tmdbShelves.map((sh) => (
        <Shelf
          key={sh.title}
          title={sh.title}
          action={<Link href={sh.href} className="text-sm font-semibold text-muted hover:text-accent">See all</Link>}
        >
          {sh.movies.map((m) => (
            <ShelfItem key={m.id}><TitleCard card={tmdbToCard(m)} href={`/movie/${m.id}`} /></ShelfItem>
          ))}
        </Shelf>
      ))}
    </>
  );
}

async function loadTmdbShelves(): Promise<{ title: string; href: string; movies: TmdbMovie[] }[]> {
  if (!tmdbEnabled()) return [];
  const defs = [
    { title: "Trending worldwide", href: "/discover?cat=trending", load: () => listCategory("trending") },
    { title: "Now playing", href: "/discover?cat=now_playing", load: () => listCategory("now_playing") },
    { title: "Bollywood", href: "/discover?lang=hi", load: () => discoverByLanguage("hi") },
    { title: "South Indian cinema", href: "/discover?lang=ta", load: () => discoverByLanguage("ta") },
    { title: "Korean cinema", href: "/discover?lang=ko", load: () => discoverByLanguage("ko") },
    { title: "Top rated", href: "/discover?cat=top_rated", load: () => listCategory("top_rated") },
  ];
  const loaded = await Promise.all(defs.map((d) => d.load()));
  return defs.map((d, i) => ({ title: d.title, href: d.href, movies: loaded[i] })).filter((s) => s.movies.length >= 3);
}

function Hero({ title }: { title: Title }) {
  const hue = hueFor(title.title);
  const image = title.backdropUrl || "";
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `radial-gradient(120% 90% at 85% 10%, hsl(${hue} 60% 32% / 0.9), transparent 60%), radial-gradient(90% 80% at 10% 100%, hsl(${(hue + 60) % 360} 55% 22% / 0.8), transparent 65%)`,
        }}
      />
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/30 to-transparent" />

      <div className="mx-auto flex min-h-[26rem] max-w-7xl items-end gap-10 px-4 pt-24 pb-10 sm:min-h-[32rem] sm:px-6 sm:pb-14">
        <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-[0.25em] text-accent uppercase">Featured film</p>
        <h1 className="mt-2 max-w-3xl font-display text-6xl leading-[0.9] tracking-wide [text-wrap:balance] sm:text-8xl">
          {title.title}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-text/80">
          {title.year && <span>{title.year}</span>}
          {title.rating && <span className="rounded border border-white/30 px-1.5 text-xs">{title.rating}</span>}
          {title.durationMin && <span>{formatDuration(title.durationMin)}</span>}
          <span className="text-muted">{title.genres.slice(0, 3).join(" · ")}</span>
        </p>
        <p className="mt-4 line-clamp-3 max-w-xl text-base text-text/80">{title.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/watch/${title.slug}`} className="btn btn-primary !px-6 !py-3 !text-base">
            <PlayIcon /> Play
          </Link>
          <Link href={`/title/${title.slug}`} className="btn btn-ghost !px-6 !py-3 !text-base">
            <InfoIcon /> Details
          </Link>
        </div>
        </div>
        {!image && (
          <Link href={`/title/${title.slug}`} className="hidden w-56 shrink-0 rotate-2 transition hover:rotate-0 lg:block" tabIndex={-1} aria-hidden="true">
            <Poster title={title.title} src={title.posterUrl} className="shadow-2xl ring-1 shadow-black/70 ring-white/10" />
          </Link>
        )}
      </div>
    </section>
  );
}

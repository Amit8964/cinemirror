import type { Metadata } from "next";
import Link from "next/link";
import TitleCard from "@/components/TitleCard";
import { SearchIcon } from "@/components/icons";
import {
  CATEGORIES, LANGUAGES, discoverByGenre, discoverByLanguage, genreList, listCategory, searchMovies,
  tmdbEnabled, tmdbToCard, type Category, type TmdbMovie,
} from "@/lib/tmdb";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  if (!tmdbEnabled()) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-5xl tracking-wide">Discover is not set up</h1>
        <p className="mt-3 text-muted">
          Add a free TMDB key as <code>TMDB_API_KEY</code> in <code>.env.local</code> and restart the server.
        </p>
      </div>
    );
  }

  const q = one(sp.q).trim().slice(0, 100);
  const lang = LANGUAGES.some((l) => l.code === one(sp.lang)) ? one(sp.lang) : "";
  const genre = Number(one(sp.genre)) || 0;
  const cat = (one(sp.cat) in CATEGORIES ? one(sp.cat) : "trending") as Category;
  const page = Math.min(Math.max(Number(one(sp.page)) || 1, 1), 20);

  const genres = await genreList();
  let movies: TmdbMovie[];
  let heading: string;
  if (q) {
    movies = await searchMovies(q, page);
    heading = `Results for “${q}”`;
  } else if (lang) {
    movies = await discoverByLanguage(lang, page);
    heading = LANGUAGES.find((l) => l.code === lang)!.label;
  } else if (genre) {
    movies = await discoverByGenre(genre, page);
    heading = genres.find((g) => g.id === genre)?.name ?? "Genre";
  } else {
    movies = await listCategory(cat, page);
    heading = CATEGORIES[cat];
  }

  const href = (next: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/discover?${s}` : "/discover";
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
      active ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:border-muted hover:text-text"
    }`;
  const filtering = !!(q || lang || genre);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-5xl tracking-wide">{heading}</h1>
      <p className="mt-1 text-sm text-muted">Movie information and trailers from TMDB.</p>

      <form action="/discover" className="relative mt-5 max-w-md">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input type="search" name="q" defaultValue={q} placeholder="Search any movie" aria-label="Search movies" className="field !rounded-full !bg-surface !py-2.5 !pl-10" />
      </form>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {(Object.keys(CATEGORIES) as Category[]).map((c) => (
          <Link key={c} href={href({ cat: c })} className={chip(!filtering && cat === c)}>{CATEGORIES[c]}</Link>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {LANGUAGES.map((l) => (
          <Link key={l.code} href={href({ lang: l.code })} className={chip(lang === l.code && !q)}>{l.label}</Link>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {genres.map((g) => (
          <Link key={g.id} href={href({ genre: g.id })} className={chip(genre === g.id && !q && !lang)}>{g.name}</Link>
        ))}
      </div>

      {movies.length ? (
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((m) => <TitleCard key={m.id} card={tmdbToCard(m)} href={`/movie/${m.id}`} />)}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-lg font-semibold">Nothing found</p>
          <p className="mt-1 text-sm text-muted">Try another search or filter.</p>
        </div>
      )}

      <div className="mt-10 flex items-center justify-center gap-3">
        {page > 1 && (
          <Link href={href({ q, lang, genre, cat: filtering ? "" : cat, page: page - 1 })} className="btn btn-ghost">Previous</Link>
        )}
        {movies.length >= 15 && (
          <Link href={href({ q, lang, genre, cat: filtering ? "" : cat, page: page + 1 })} className="btn btn-ghost">Next</Link>
        )}
      </div>
    </div>
  );
}

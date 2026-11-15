import type { Metadata } from "next";
import Link from "next/link";
import TitleCard from "@/components/TitleCard";
import { SearchIcon } from "@/components/icons";
import {
  LANGUAGES, TV_CATEGORIES, discoverTv, listTv, searchTv, showToCard, tmdbEnabled, tvGenreList,
  type TmdbShow, type TvCategory,
} from "@/lib/tmdb";

export const metadata: Metadata = { title: "Web Series" };

export default async function SeriesPage({ searchParams }: PageProps<"/series">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  if (!tmdbEnabled()) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-5xl tracking-wide">Web Series is not set up</h1>
        <p className="mt-3 text-muted">Add <code>TMDB_API_KEY</code> to <code>.env.local</code> and restart the server.</p>
      </div>
    );
  }

  const q = one(sp.q).trim().slice(0, 100);
  const lang = LANGUAGES.some((l) => l.code === one(sp.lang)) ? one(sp.lang) : "";
  const genre = Number(one(sp.genre)) || 0;
  const cat = (one(sp.cat) in TV_CATEGORIES ? one(sp.cat) : "trending") as TvCategory;
  const page = Math.min(Math.max(Number(one(sp.page)) || 1, 1), 20);

  const genres = await tvGenreList();
  let shows: TmdbShow[];
  let heading: string;
  if (q) {
    shows = await searchTv(q, page);
    heading = `Series matching “${q}”`;
  } else if (lang || genre) {
    shows = await discoverTv({ lang, genre, page });
    heading = [LANGUAGES.find((l) => l.code === lang)?.label.replace(/ \(.*\)/, ""), genres.find((g) => g.id === genre)?.name]
      .filter(Boolean)
      .join(" · ") + " series";
  } else {
    shows = await listTv(cat, page);
    heading = TV_CATEGORIES[cat];
  }

  const href = (next: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, String(v));
    const s = p.toString();
    return s ? `/series?${s}` : "/series";
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
      active ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:border-muted hover:text-text"
    }`;
  const filtering = !!(q || lang || genre);

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-8">
      <p className="text-xs font-bold tracking-[0.3em] text-accent uppercase">Web Series</p>
      <h1 className="mt-1 font-display text-5xl tracking-wide">{heading}</h1>

      <form action="/series" id="search" className="relative mt-5 max-w-md scroll-mt-24" role="search">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input type="search" name="q" defaultValue={q} placeholder="Search web series" aria-label="Search web series" className="field !rounded-full !bg-surface !py-2.5 !pl-10" />
      </form>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {(Object.keys(TV_CATEGORIES) as TvCategory[]).map((c) => (
          <Link key={c} href={href({ cat: c })} className={chip(!filtering && cat === c)}>{TV_CATEGORIES[c]}</Link>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {LANGUAGES.map((l) => (
          <Link key={l.code} href={href({ lang: l.code, genre })} className={chip(lang === l.code && !q)}>
            {l.label.replace(/ \(.*\)/, "")}
          </Link>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {genres.map((g) => (
          <Link key={g.id} href={href({ genre: g.id, lang })} className={chip(genre === g.id && !q)}>{g.name}</Link>
        ))}
      </div>

      {shows.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-7">
          {shows.map((s) => <TitleCard key={s.id} card={showToCard(s)} href={`/series/${s.id}`} rating={s.rating} />)}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-lg font-semibold">No series found</p>
          <p className="mt-1 text-sm text-muted">Try another search or filter.</p>
        </div>
      )}

      <div className="mt-10 flex items-center justify-center gap-3">
        {page > 1 && <Link href={href({ q, lang, genre, cat: filtering ? "" : cat, page: page - 1 })} className="btn btn-ghost">Previous</Link>}
        {shows.length >= 15 && <Link href={href({ q, lang, genre, cat: filtering ? "" : cat, page: page + 1 })} className="btn btn-ghost">Next</Link>}
      </div>
    </div>
  );
}

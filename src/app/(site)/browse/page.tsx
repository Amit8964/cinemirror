import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import TitleCard from "@/components/TitleCard";
import { listTitles, toCard } from "@/lib/titles";

export const metadata: Metadata = { title: "Browse" };

const SORTS = { new: "Newest added", year: "Release year", az: "A–Z" } as const;
type Sort = keyof typeof SORTS;

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim().slice(0, 80);
  const genre = one(sp.genre).trim();
  const sort: Sort = one(sp.sort) in SORTS ? (one(sp.sort) as Sort) : "new";

  const all = await listTitles();
  const genres = [...new Set(all.flatMap((t) => t.genres))].sort();

  const needle = q.toLowerCase();
  let results = all.filter(
    (t) =>
      (!genre || t.genres.includes(genre)) &&
      (!needle ||
        t.title.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        t.genres.some((g) => g.toLowerCase().includes(needle)) ||
        String(t.year ?? "") === needle),
  );
  if (sort === "year") results = [...results].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  if (sort === "az") results = [...results].sort((a, b) => a.title.localeCompare(b.title));

  const link = (next: { genre?: string; sort?: string }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const g = next.genre ?? genre;
    if (g) p.set("genre", g);
    const s = next.sort ?? sort;
    if (s !== "new") p.set("sort", s);
    const qs = p.toString();
    return qs ? `/browse?${qs}` : "/browse";
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
      active ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:border-muted hover:text-text"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-5xl tracking-wide">{q ? `Results for “${q}”` : genre || "Browse"}</h1>
      <p className="mt-1 text-sm text-muted">
        {results.length} {results.length === 1 ? "film" : "films"}
        {q && <> · <Link href={genre ? `/browse?genre=${encodeURIComponent(genre)}` : "/browse"} className="text-accent hover:underline">Clear search</Link></>}
      </p>

      <form action="/browse" id="search" className="relative mt-5 max-w-md scroll-mt-24">
        {genre && <input type="hidden" name="genre" value={genre} />}
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title, genre or year"
          aria-label="Search films"
          className="field !rounded-full !bg-surface !py-2.5 !pl-10"
        />
      </form>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={link({ genre: "" })} className={chip(!genre)}>All</Link>
        {genres.map((g) => (
          <Link key={g} href={link({ genre: g })} className={chip(genre === g)}>{g}</Link>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-muted">Sort by</span>
        {(Object.keys(SORTS) as Sort[]).map((s) => (
          <Link
            key={s}
            href={link({ sort: s })}
            className={sort === s ? "font-bold text-accent" : "font-semibold text-muted hover:text-text"}
            aria-current={sort === s ? "true" : undefined}
          >
            {SORTS[s]}
          </Link>
        ))}
      </div>

      {results.length ? (
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((t) => <TitleCard key={t.id} card={toCard(t)} />)}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-lg font-semibold">No films match</p>
          <p className="mt-1 text-sm text-muted">Try a different title, genre or year.</p>
          <Link href="/browse" className="btn btn-ghost mt-5">Show everything</Link>
        </div>
      )}
    </div>
  );
}

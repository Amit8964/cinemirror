import type { Metadata } from "next";
import Link from "next/link";
import TitleForm from "@/components/admin/TitleForm";
import { getMovie, searchMovies, tmdbEnabled, LANGUAGES } from "@/lib/tmdb";
import type { Title } from "@/lib/types";
import { slugify } from "@/lib/util";

export const metadata: Metadata = { title: "Add title" };

export default async function NewTitlePage({ searchParams }: PageProps<"/admin/titles/new">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim();
  const tmdbId = Number(one(sp.tmdb)) || 0;
  const enabled = tmdbEnabled();

  let prefill: Partial<Title> | undefined;
  if (enabled && tmdbId) {
    const m = await getMovie(tmdbId);
    if (m) {
      prefill = {
        title: m.title,
        slug: slugify(m.title),
        description: m.overview,
        year: m.year,
        durationMin: m.runtime,
        genres: m.genres.map((g) => g.name),
        rating: m.certification,
        language: LANGUAGES.find((l) => l.code === m.language)?.label.replace(/ \(.*\)/, "") ?? m.language,
        posterUrl: m.posterUrl.replace("/w342/", "/w500/"),
        backdropUrl: m.backdropUrl,
        credit: "Film information and images: TMDB",
      };
    }
  }
  const results = enabled && q ? await searchMovies(q) : [];

  return (
    <>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Add title</h1>

      {enabled && (
        <section className="mb-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Fill details from TMDB</h2>
          <form className="mt-3 flex max-w-lg gap-2">
            <input name="q" defaultValue={q} placeholder="Search a movie…" className="field" aria-label="Search TMDB" />
            <button className="btn btn-ghost">Search</button>
          </form>
          {results.length > 0 && (
            <ul className="mt-3 divide-y divide-line">
              {results.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-semibold">
                    {r.title} <span className="font-normal text-muted">{r.year ?? ""}</span>
                  </span>
                  <Link href={`/admin/titles/new?tmdb=${r.id}`} className="shrink-0 font-semibold text-accent hover:underline">Use</Link>
                </li>
              ))}
            </ul>
          )}
          {prefill && <p className="mt-3 text-sm text-muted">Filled from TMDB: <b className="text-text">{prefill.title}</b>. Add your video source below.</p>}
        </section>
      )}

      <TitleForm key={tmdbId} prefill={prefill} />
    </>
  );
}

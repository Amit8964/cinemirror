import type { Metadata } from "next";
import Link from "next/link";
import ImportPanel from "@/components/admin/ImportPanel";
import PublicStreamsPanel from "@/components/admin/PublicStreamsPanel";
import TitleForm from "@/components/admin/TitleForm";
import { importFromLink, prefillFromTmdb, type ImportResult } from "@/lib/importer";
import { searchPublicStreams, type PublicResult, type PublicSource } from "@/lib/public-streams";
import { getMovie, searchMovies, tmdbEnabled } from "@/lib/tmdb";
import type { Title } from "@/lib/types";

export const metadata: Metadata = { title: "Add title" };

export default async function NewTitlePage({ searchParams }: PageProps<"/admin/titles/new">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).trim();
  const link = one(sp.link).trim();
  const stream = one(sp.stream);
  const tmdb = one(sp.tmdb);
  const tmdbId = Number(tmdb) || 0;
  const enabled = tmdbEnabled();

  let imported: ImportResult | null = null;
  let prefill: Partial<Title> | undefined;
  if (link) {
    imported = await importFromLink(link, { stream, tmdb });
    prefill = imported.prefill;
  } else if (enabled && tmdbId) {
    const m = await getMovie(tmdbId);
    if (m) prefill = prefillFromTmdb(m);
  }
  const results = enabled && q ? await searchMovies(q) : [];

  // "Browse public streams": only searches when that form was submitted.
  const browse = one(sp.browse) === "1";
  const psource: PublicSource = one(sp.psource) === "commons" ? "commons" : "archive";
  const pq = one(sp.pq).trim();
  const ppage = Math.max(1, Number.parseInt(one(sp.ppage), 10) || 1);
  const browsed = browse && !link ? await searchPublicStreams(psource, pq, ppage) : { results: [] as PublicResult[], error: undefined };

  // Picking a film from the manual search keeps the imported link and stream.
  const pickHref = (id: number) => {
    const p = new URLSearchParams({ tmdb: String(id) });
    if (link) p.set("link", link);
    return `/admin/titles/new?${p}`;
  };

  return (
    <>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Add title</h1>

      <PublicStreamsPanel
        source={psource}
        query={pq}
        page={ppage}
        searched={browse && !link}
        results={browsed.results}
        error={browsed.error}
      />

      <ImportPanel link={link} result={imported} stream={stream} tmdb={tmdb} tmdbEnabled={enabled} />

      {enabled && (
        <section className="mb-6 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Fill details from TMDB</h2>
          <form className="mt-3 flex max-w-lg gap-2">
            {link && <input type="hidden" name="link" value={link} />}
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
                  <Link href={pickHref(r.id)} className="shrink-0 font-semibold text-accent hover:underline">Use</Link>
                </li>
              ))}
            </ul>
          )}
          {!link && prefill && <p className="mt-3 text-sm text-muted">Filled from TMDB: <b className="text-text">{prefill.title}</b>. Add your video source below.</p>}
        </section>
      )}

      <TitleForm key={`${link}|${stream}|${tmdb}`} prefill={prefill} />
    </>
  );
}

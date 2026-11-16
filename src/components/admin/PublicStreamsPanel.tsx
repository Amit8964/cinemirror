/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { PUBLIC_SOURCES, type PublicResult, type PublicSource } from "@/lib/public-streams";

/** "Browse public streams" box on the Add title page: search free catalogues, click a result to import it. */
export default function PublicStreamsPanel({
  source, query, page, searched, results, error,
}: {
  source: PublicSource;
  query: string;
  page: number;
  searched: boolean;
  results: PublicResult[];
  error?: string;
}) {
  const pageHref = (n: number) => {
    const p = new URLSearchParams({ psource: source, pq: query, ppage: String(n), browse: "1" });
    return `/admin/titles/new?${p}`;
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Browse public streams</h2>
      <p className="mt-1 text-sm text-muted">
        Search free catalogues of public-domain and freely licensed films. Pick one to import it — the stream, poster and licence are filled in for you.
      </p>
      <form action="/admin/titles/new" className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="browse" value="1" />
        <select name="psource" defaultValue={source} className="field !w-auto" aria-label="Source">
          {PUBLIC_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <input name="pq" defaultValue={query} placeholder="Search by title, or leave empty for popular…" className="field min-w-48 flex-1" aria-label="Search public streams" />
        <button className="btn btn-primary shrink-0">Search</button>
      </form>

      {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}

      {searched && !error && results.length === 0 && <p className="mt-3 text-sm text-muted">Nothing found. Try a different title.</p>}

      {results.length > 0 && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {results.map((r) => (
              <li key={r.url}>
                <Link href={`/admin/titles/new?${new URLSearchParams({ link: r.url })}`} className="block rounded-lg p-1 text-xs hover:bg-white/5">
                  <div className="aspect-[2/3] w-full overflow-hidden rounded bg-black/30">
                    {r.thumb && <img src={r.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <span className="mt-1 line-clamp-2 block font-semibold">{r.title}</span>
                  <span className="text-muted">{r.year ?? "—"}</span>
                  {r.license && <span className="ml-1 text-emerald-400">✓</span>}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3 text-sm">
            {page > 1 && <Link href={pageHref(page - 1)} className="font-semibold text-accent hover:underline">← Previous</Link>}
            <span className="text-muted">Page {page}</span>
            <Link href={pageHref(page + 1)} className="font-semibold text-accent hover:underline">Next →</Link>
          </div>
        </>
      )}
    </section>
  );
}

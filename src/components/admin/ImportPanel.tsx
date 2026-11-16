/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { bulkImportAction, quickImportAction } from "@/app/admin/actions";
import type { ImportResult } from "@/lib/importer";

const typeBadge = {
  hls: "bg-accent/15 text-accent",
  mp4: "bg-sky-500/15 text-sky-400",
  youtube: "bg-red-500/15 text-red-400",
} as const;

/** "Import from a link" box on the Add title page, plus what was found for the pasted link. */
export default function ImportPanel({
  link, result, stream, tmdb, tmdbEnabled, error, bulkLink = "",
}: {
  error?: string;
  bulkLink?: string;
  link: string;
  result: ImportResult | null;
  stream: string;
  tmdb: string;
  tmdbEnabled: boolean;
}) {
  const href = (change: { stream?: number | string; tmdb?: number | string }) => {
    const p = new URLSearchParams({ link });
    const s = change.stream ?? stream;
    const t = change.tmdb ?? tmdb;
    if (s !== "") p.set("stream", String(s));
    if (t !== "") p.set("tmdb", String(t));
    return `/admin/titles/new?${p}`;
  };

  return (
    <section className="mb-6 rounded-xl border border-accent/30 bg-surface p-5">
      <h2 className="text-xs font-bold tracking-wider text-muted uppercase">Import from a link</h2>
      <p className="mt-1 text-sm text-muted">
        Paste an archive.org or Wikimedia Commons page, a YouTube link, a direct .m3u8 / .mp4, or any page with a video.
        Streams are found and the film is matched on TMDB{tmdbEnabled ? "" : " (set TMDB_API_KEY to enable)"} — if there is no full stream, the trailer is used.
      </p>
      <form action="/admin/titles/new" className="mt-3 flex gap-2">
        <input
          name="link"
          type="url"
          required
          defaultValue={link}
          placeholder="https://archive.org/details/nosferatu_1922"
          className="field font-mono !text-xs"
          aria-label="Link to import"
        />
        <button className="btn btn-ghost shrink-0">Find streams</button>
        <button formAction={quickImportAction} formMethod="post" className="btn btn-primary shrink-0" title="Find the stream and TMDB poster, save it, and show it on the home page">
          Import &amp; publish
        </button>
      </form>
      <details className="mt-4 rounded-lg border border-line p-3" open={!!bulkLink}>
        <summary className="cursor-pointer text-sm font-bold">Bulk import</summary>
        <p className="mt-2 text-xs text-muted">
          Paste an <b>archive.org collection</b> or a <b>Wikimedia Commons category</b> to import every film in it (20 per batch, published only when the
          source confirms a free licence). Paste a <b>YouTube playlist or channel</b> link (<code>?list=…</code> or <code>/channel/UC…</code>) to import its latest 15
          videos as hidden drafts — YouTube doesn&apos;t state a licence, so you publish the ones you have the right to. Paste any <b>other page</b> to import every distinct video on that one page as hidden drafts to review.
          It never crawls a whole site.
        </p>
        <form action={bulkImportAction} className="mt-2 flex flex-wrap gap-2">
          <input name="link" type="url" required defaultValue={bulkLink} placeholder="https://archive.org/details/feature_films" className="field min-w-48 flex-1 font-mono !text-xs" aria-label="Collection, category or page link" />
          <input name="batch" type="number" min={1} max={50} defaultValue={1} className="field !w-20" aria-label="Batch number" title="Batch number (20 films each)" />
          <button className="btn btn-primary shrink-0">Import all</button>
        </form>
      </details>
      {error && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{error}</p>}
      <p className="mt-2 text-xs text-muted">
        <b>Import &amp; publish</b> saves it in one step and puts it on the home page when the source confirms it&apos;s public domain or freely licensed;
        otherwise it&apos;s saved as a hidden draft. <b>Find streams</b> lets you review first.
      </p>

      {result && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Source:</span>
            <a href={result.resolved.pageUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
              {result.resolved.sourceName}
            </a>
            {result.resolved.titleGuess && (
              <span className="text-muted">
                · read as <b className="text-text">{result.resolved.titleGuess}</b>
                {result.resolved.yearGuess ? ` (${result.resolved.yearGuess})` : ""}
              </span>
            )}
          </div>

          {result.resolved.licenseOk ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              ✓ {result.resolved.license}
            </p>
          ) : result.options[result.chosen]?.trailer ? null : result.options.length > 0 ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              Couldn&apos;t confirm this video is public domain or free to stream
              {result.resolved.license ? ` (source says: ${result.resolved.license})` : ""}. Only publish it if you have the rights.
            </p>
          ) : null}

          <div>
            <h3 className="text-sm font-bold">Streams</h3>
            {result.resolved.error && <p className="mt-1 text-sm text-muted">{result.resolved.error}</p>}
            {result.options.length > 0 ? (
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
                {result.options.map((o, i) => (
                  <li key={o.url}>
                    <Link
                      href={href({ stream: i })}
                      scroll={false}
                      className={`flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 ${i === result.chosen ? "bg-accent/10" : ""}`}
                    >
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${i === result.chosen ? "border-accent bg-accent" : "border-line"}`} />
                      <b className={`shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] uppercase ${typeBadge[o.type]}`}>{o.trailer ? "trailer" : o.type}</b>
                      <span className="min-w-0 truncate">{o.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">Nothing playable found{result.movie ? " and TMDB has no trailer for this film" : ""}. You can still paste a stream URL in the form below.</p>
            )}
          </div>

          {tmdbEnabled && (
            <div>
              <h3 className="text-sm font-bold">TMDB match</h3>
              {result.candidates.length === 0 && !result.movie ? (
                <p className="mt-1 text-sm text-muted">No TMDB match — details below come from the source. Use the TMDB search below to pick the film manually.</p>
              ) : (
                <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
                  {result.candidates.map((m) => {
                    const on = result.movie?.id === m.id;
                    return (
                      <Link key={m.id} href={href({ tmdb: m.id, stream: "" })} scroll={false} className={`w-24 shrink-0 rounded-lg p-1 text-xs ${on ? "bg-accent/15 ring-2 ring-accent" : "hover:bg-white/5"}`}>
                        <img src={m.posterUrl} alt="" className="aspect-[2/3] w-full rounded object-cover" loading="lazy" />
                        <span className="mt-1 line-clamp-2 block font-semibold">{m.title}</span>
                        <span className="text-muted">{m.year ?? "—"}</span>
                      </Link>
                    );
                  })}
                  <Link href={href({ tmdb: "none", stream: "" })} scroll={false} className={`grid w-24 shrink-0 place-items-center rounded-lg border border-dashed border-line p-2 text-center text-xs ${result.tmdbMode === "none" ? "ring-2 ring-accent" : "hover:bg-white/5"}`}>
                    Don&apos;t use TMDB
                  </Link>
                </div>
              )}
            </div>
          )}

          {result.chosen >= 0 && (
            <form action={quickImportAction}>
              <input type="hidden" name="link" value={link} />
              <input type="hidden" name="stream" value={stream} />
              <input type="hidden" name="tmdb" value={tmdb} />
              <button className="btn btn-primary">Import &amp; publish with these choices</button>
            </form>
          )}

          {result.chosen >= 0 && (
            <p className="text-sm text-muted">
              The form below is filled in{result.movie ? ` with “${result.movie.title}” from TMDB` : ""}. Preview it, check the details and press <b className="text-text">Add title</b>.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

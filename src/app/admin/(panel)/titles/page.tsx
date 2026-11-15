import type { Metadata } from "next";
import Link from "next/link";
import Poster from "@/components/Poster";
import { getTitlePlayCounts } from "@/lib/analytics";
import { listTitles } from "@/lib/titles";
import { formatNumber } from "@/lib/util";

export const metadata: Metadata = { title: "Titles" };

export default async function TitlesPage() {
  const [titles, plays] = await Promise.all([listTitles({ includeDrafts: true }), getTitlePlayCounts()]);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Titles</h1>
          <p className="text-sm text-muted">{titles.length} in the catalogue</p>
        </div>
        <Link href="/admin/titles/new" className="btn btn-primary">Add title</Link>
      </div>

      {titles.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Format</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Plays</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {titles.map((t) => (
                <tr key={t.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/titles/${t.id}`} className="flex items-center gap-3 hover:text-accent">
                      <Poster title={t.title} src={t.posterUrl} className="w-9 shrink-0 !rounded [&_span]:hidden" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{t.title}</span>
                        <span className="block truncate text-xs text-muted">{[t.year, t.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted uppercase">{t.sourceType}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.published ? "bg-ok/15 text-ok" : "bg-white/10 text-muted"}`}>
                      {t.published ? "Published" : "Draft"}
                    </span>
                    {t.featured && <span className="ml-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Featured</span>}
                    {!t.embeddable && <span className="ml-1.5 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-muted">No embeds</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(plays.get(t.id) ?? 0)}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Link href={`/watch/${t.slug}`} className="mr-3 font-semibold text-muted hover:text-text">Watch</Link>
                    <Link href={`/admin/titles/${t.id}`} className="font-semibold text-accent hover:underline">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-lg font-semibold">No titles yet</p>
          <p className="mt-1 text-sm text-muted">Add a film you own or are licensed to stream.</p>
          <Link href="/admin/titles/new" className="btn btn-primary mt-5">Add title</Link>
        </div>
      )}
    </>
  );
}

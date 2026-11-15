import type { Metadata } from "next";
import Link from "next/link";
import { DMCA_STATUSES, dmcaCounts, isDmcaStatus, listDmcaReports, type DmcaStatus } from "@/lib/dmca";

export const metadata: Metadata = { title: "DMCA notices" };

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function DmcaInboxPage({ searchParams }: PageProps<"/admin/dmca">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status ?? "";
  const status = isDmcaStatus(raw) ? raw : undefined;
  const [reports, counts] = await Promise.all([listDmcaReports(status), dmcaCounts()]);

  const tabs: { key: DmcaStatus | ""; label: string; n: number }[] = [
    { key: "", label: "All", n: counts.all },
    ...(Object.keys(DMCA_STATUSES) as DmcaStatus[]).map((k) => ({ key: k, label: DMCA_STATUSES[k].label, n: counts[k] })),
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">DMCA notices</h1>
          <p className="text-sm text-muted">
            Copyright reports sent from the public <Link href="/dmca" className="font-semibold text-accent hover:underline">/dmca</Link> page.
          </p>
        </div>
        {counts.new > 0 && (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-accent">{counts.new} waiting for review</span>
        )}
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const active = (status ?? "") === t.key;
          return (
            <Link
              key={t.key || "all"}
              href={t.key ? `/admin/dmca?status=${t.key}` : "/admin/dmca"}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                active ? "border-accent bg-accent text-accent-ink" : "border-line text-muted hover:border-muted hover:text-text"
              }`}
            >
              {t.label} <span className={active ? "opacity-70" : "text-muted/70"}>{t.n}</span>
            </Link>
          );
        })}
      </div>

      {reports.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Sent by</th>
                <th className="px-4 py-3 font-semibold">Work</th>
                <th className="px-4 py-3 font-semibold">Links</th>
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className={`border-b border-line/60 last:border-0 hover:bg-raised/50 ${r.status === "new" ? "font-semibold" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/dmca/${r.id}`} className="font-mono text-xs font-bold text-accent hover:underline">{r.ref}</Link>
                  </td>
                  <td className="max-w-[14rem] px-4 py-3">
                    <Link href={`/admin/dmca/${r.id}`} className="block truncate hover:text-accent">{r.name}</Link>
                    <span className="block truncate text-xs font-normal text-muted">{r.organization || r.email}</span>
                  </td>
                  <td className="max-w-[16rem] px-4 py-3">
                    <span className="line-clamp-2 font-normal text-text/85">{r.work}</span>
                  </td>
                  <td className="px-4 py-3 font-normal whitespace-nowrap text-muted">
                    {r.urls.length} link{r.urls.length === 1 ? "" : "s"}
                    {r.titleIds.length > 0 && <span className="ml-1.5 rounded bg-danger/15 px-1.5 py-0.5 text-[11px] font-bold text-danger">{r.titleIds.length} in library</span>}
                  </td>
                  <td className="px-4 py-3 font-normal whitespace-nowrap text-muted">{when.format(r.createdAt * 1000)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${DMCA_STATUSES[r.status].className}`}>
                      {DMCA_STATUSES[r.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-lg font-semibold">{status ? "Nothing here" : "No notices yet"}</p>
          <p className="mt-1 text-sm text-muted">Copyright reports submitted at /dmca will appear here.</p>
        </div>
      )}
    </>
  );
}

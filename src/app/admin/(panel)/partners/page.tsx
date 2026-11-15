import type { Metadata } from "next";
import Link from "next/link";
import { getPartnerTotals } from "@/lib/analytics";
import { listPartners } from "@/lib/partners";
import { formatNumber, formatWatchTime } from "@/lib/util";

export const metadata: Metadata = { title: "Partners" };

export default async function PartnersPage() {
  const [partners, totals] = await Promise.all([listPartners(), getPartnerTotals(30)]);
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Partners</h1>
          <p className="text-sm text-muted">Websites that embed your player with their own key. Numbers are for the last 30 days.</p>
        </div>
        <Link href="/admin/partners/new" className="btn btn-primary">New partner</Link>
      </div>

      {partners.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Watching now</th>
                <th className="px-4 py-3 text-right font-semibold">Plays</th>
                <th className="px-4 py-3 text-right font-semibold">Viewers</th>
                <th className="px-4 py-3 text-right font-semibold">Watch time</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const t = totals.get(p.id);
                return (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/partners/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link>
                      <p className="max-w-xs truncate text-xs text-muted">
                        {p.allowedDomains.length ? p.allowedDomains.join(", ") : "Any site (unrestricted)"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.active ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger"}`}>
                        {p.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t?.live ?? 0}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNumber(t?.plays ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-muted tabular-nums">{formatNumber(t?.viewers ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-muted tabular-nums">{formatWatchTime(t?.watchSeconds ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-lg font-semibold">No partners yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Create a partner to get an embed code for their website. Every play through that code is counted under their name.
          </p>
          <Link href="/admin/partners/new" className="btn btn-primary mt-5">New partner</Link>
        </div>
      )}
    </>
  );
}

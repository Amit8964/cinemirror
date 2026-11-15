import Link from "next/link";
import {
  getCountries, getDaily, getDevices, getRecentPlays, getSummary, getTopDomains, getTopPartners,
  getTopTitles, type BreakdownRow, type StatsFilter,
} from "@/lib/analytics";
import { formatNumber, formatWatchTime } from "@/lib/util";
import DailyChart from "./DailyChart";

export const RANGES = [7, 30, 90] as const;

export function parseDays(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (RANGES as readonly number[]).includes(n) ? n : 30;
}

export function RangeTabs({ days, basePath }: { days: number; basePath: string }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-sm font-semibold" role="group" aria-label="Date range">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`${basePath}?days=${r}`}
          scroll={false}
          aria-current={days === r ? "true" : undefined}
          className={`rounded-md px-3 py-1.5 ${days === r ? "bg-raised text-text" : "text-muted hover:text-text"}`}
        >
          {r} days
        </Link>
      ))}
    </div>
  );
}

function Tile({ label, value, hint, live }: { label: string; value: string; hint?: string; live?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        {live && <span className="h-2 w-2 rounded-full bg-ok shadow-[0_0_0_3px_rgb(62_207_142/0.2)]" />}
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Breakdown({ rows, empty, unknown, hrefFor }: {
  rows: BreakdownRow[]; empty: string; unknown?: string; hrefFor?: (row: BreakdownRow) => string | null;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.plays));
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="w-full pb-2 font-semibold"><span className="sr-only">Name</span></th>
          <th className="pb-2 pl-3 text-right font-semibold">Plays</th>
          <th className="pb-2 pl-5 text-right font-semibold">Viewers</th>
          <th className="hidden pb-2 pl-5 text-right font-semibold whitespace-nowrap sm:table-cell">Watch time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const label = r.label || unknown || "Unknown";
          const href = hrefFor?.(r);
          return (
            <tr key={r.key} className="border-t border-line/70">
              <td className="relative w-full max-w-0 py-2 pr-2">
                <span
                  className="absolute inset-y-1 left-0 rounded bg-white/[0.06]"
                  style={{ width: `${(r.plays / max) * 100}%` }}
                  aria-hidden="true"
                />
                <span className="relative block truncate pl-2 font-medium">
                  {href ? <Link href={href} className="hover:text-accent hover:underline">{label}</Link> : label}
                </span>
              </td>
              <td className="py-2 pl-3 text-right font-semibold tabular-nums">{formatNumber(r.plays)}</td>
              <td className="py-2 pl-5 text-right text-muted tabular-nums">{formatNumber(r.viewers)}</td>
              <td className="hidden py-2 pl-5 text-right text-muted tabular-nums sm:table-cell">{formatWatchTime(r.watchSeconds)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ago(sec: number): string {
  const d = Math.max(0, Math.floor(Date.now() / 1000) - sec);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

/** The full analytics block. With `partnerId` it shows a single partner's embeds only. */
export default async function StatsView({ filter }: { filter: StatsFilter }) {
  const scoped = !!filter.partnerId;
  const [summary, daily, titles, partners, domains, countries, devices, recent] = await Promise.all([
    getSummary(filter),
    getDaily(filter),
    getTopTitles(filter),
    scoped ? Promise.resolve([]) : getTopPartners(filter),
    getTopDomains(filter),
    getCountries(filter),
    getDevices(filter),
    getRecentPlays(filter),
  ]);

  const avg = summary.plays ? summary.watchSeconds / summary.plays : 0;
  const completion = summary.plays ? Math.round((summary.completed / summary.plays) * 100) : 0;
  const hasCountry = countries.some((c) => c.key);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile label="Watching now" value={formatNumber(summary.live)} hint="active in the last 40s" live />
        <Tile label="Plays" value={formatNumber(summary.plays)} hint={`last ${filter.days} days`} />
        <Tile label="Unique viewers" value={formatNumber(summary.viewers)} hint="distinct browsers" />
        <Tile label="Watch time" value={formatWatchTime(summary.watchSeconds)} hint="actually played" />
        <Tile label="Avg. per play" value={formatWatchTime(avg)} />
        <Tile label="Completion" value={`${completion}%`} hint="reached 90% of the film" />
      </div>

      <Panel title="Plays per day" note="Days in UTC">
        <DailyChart data={daily} only={scoped ? "embed" : undefined} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {!scoped && (
          <Panel title="Top partners" note="Embeds only">
            <Breakdown rows={partners} empty="No partner embeds have been played yet." hrefFor={(r) => `/admin/partners/${r.key}`} />
          </Panel>
        )}
        <Panel title="Top titles">
          <Breakdown rows={titles} empty="Nothing has been played yet." />
        </Panel>
        <Panel title={scoped ? "Sites playing this partner's embeds" : "Top embedding sites"} note="Domain of the page hosting the player">
          <Breakdown rows={domains} empty="No embed plays yet." unknown="Unknown site (referrer hidden)" />
        </Panel>
        <Panel title="Devices">
          <Breakdown rows={devices.map((d) => ({ ...d, label: d.label.charAt(0).toUpperCase() + d.label.slice(1) }))} empty="No plays yet." />
        </Panel>
        <Panel title="Countries" note={hasCountry ? undefined : "Needs a host/CDN that sends a country header"}>
          <Breakdown rows={countries} empty="No plays yet." unknown="Unknown" />
        </Panel>
      </div>

      <Panel title="Recent plays">
        {recent.length ? (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-semibold">Started</th>
                  <th className="pb-2 font-semibold">Title</th>
                  <th className="pb-2 font-semibold">Where</th>
                  <th className="pb-2 font-semibold">Device</th>
                  <th className="pb-2 text-right font-semibold">Watched</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-line/70">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted">
                      {p.live ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-ok">
                          <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Live
                        </span>
                      ) : ago(p.startedAt)}
                    </td>
                    <td className="max-w-[14rem] truncate py-2 pr-3 font-medium">{p.title}</td>
                    <td className="max-w-[16rem] truncate py-2 pr-3 text-muted">
                      {p.partner ? <>{p.partner}{p.domain ? <span className="text-muted/70"> · {p.domain}</span> : null}</> : "On this site"}
                      {p.country ? ` · ${p.country}` : ""}
                    </td>
                    <td className="py-2 pr-3 text-muted capitalize">{p.device}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatWatchTime(p.watchSeconds)}
                      {p.completed && <span className="ml-1.5 text-xs text-ok" title="Reached 90% of the film">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Plays will appear here as soon as someone presses play.</p>
        )}
      </Panel>
    </div>
  );
}

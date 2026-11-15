import type { InValue } from "@libsql/client";
import { query, run, newId, nowSec } from "./db";

/** A play counts as "watching now" if it sent a heartbeat this recently. */
const LIVE_WINDOW_SEC = 40;

export interface StatsFilter {
  days: number;
  partnerId?: string;
  titleId?: string;
}

function scope(f: StatsFilter): { where: string; args: InValue[] } {
  const parts = ["p.started_at >= ?"];
  const args: InValue[] = [nowSec() - f.days * 86400];
  if (f.partnerId) {
    parts.push("p.partner_id = ?");
    args.push(f.partnerId);
  }
  if (f.titleId) {
    parts.push("p.title_id = ?");
    args.push(f.titleId);
  }
  return { where: parts.join(" AND "), args };
}

// ---- writes -----------------------------------------------------------------

export async function recordStart(input: {
  titleId: string;
  partnerId: string | null;
  viewerId: string;
  domain: string | null;
  country: string | null;
  device: string;
}): Promise<string> {
  const id = newId();
  const now = nowSec();
  await run(
    `INSERT INTO plays (id, title_id, partner_id, viewer_id, domain, country, device, started_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.titleId, input.partnerId, input.viewerId, input.domain, input.country, input.device, now, now],
  );
  return id;
}

export async function recordBeat(
  playId: string,
  beat: { delta: number; position: number; completed: boolean },
): Promise<void> {
  const now = nowSec();
  // Watch time can never grow faster than wall-clock time since the last beat,
  // so a client cannot inflate it by sending large deltas.
  await run(
    `UPDATE plays SET
       watch_seconds = watch_seconds + MIN(?, MAX(0, ? - last_seen_at) + 5),
       last_seen_at = ?,
       max_position = MAX(max_position, ?),
       completed = MAX(completed, ?)
     WHERE id = ?`,
    [beat.delta, now, now, beat.position, beat.completed ? 1 : 0, playId],
  );
}

// ---- reads ------------------------------------------------------------------

export interface Summary {
  plays: number;
  viewers: number;
  watchSeconds: number;
  completed: number;
  live: number;
}

export async function getSummary(f: StatsFilter): Promise<Summary> {
  const s = scope(f);
  const [row] = await query<{ plays: number; viewers: number; watch: number | null; completed: number | null }>(
    `SELECT COUNT(*) AS plays, COUNT(DISTINCT p.viewer_id) AS viewers,
            SUM(p.watch_seconds) AS watch, SUM(p.completed) AS completed
     FROM plays p WHERE ${s.where}`,
    s.args,
  );
  const liveArgs: InValue[] = [nowSec() - LIVE_WINDOW_SEC];
  let liveWhere = "p.last_seen_at >= ?";
  if (f.partnerId) {
    liveWhere += " AND p.partner_id = ?";
    liveArgs.push(f.partnerId);
  }
  if (f.titleId) {
    liveWhere += " AND p.title_id = ?";
    liveArgs.push(f.titleId);
  }
  const [live] = await query<{ n: number }>(
    `SELECT COUNT(DISTINCT p.viewer_id) AS n FROM plays p WHERE ${liveWhere}`,
    liveArgs,
  );
  return {
    plays: row?.plays ?? 0,
    viewers: row?.viewers ?? 0,
    watchSeconds: row?.watch ?? 0,
    completed: row?.completed ?? 0,
    live: live?.n ?? 0,
  };
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD (UTC)
  direct: number;
  embed: number;
}

export async function getDaily(f: StatsFilter): Promise<DailyPoint[]> {
  const s = scope(f);
  const rows = await query<{ day: string; direct: number; embed: number }>(
    `SELECT strftime('%Y-%m-%d', p.started_at, 'unixepoch') AS day,
            SUM(CASE WHEN p.partner_id IS NULL THEN 1 ELSE 0 END) AS direct,
            SUM(CASE WHEN p.partner_id IS NULL THEN 0 ELSE 1 END) AS embed
     FROM plays p WHERE ${s.where} GROUP BY day`,
    s.args,
  );
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DailyPoint[] = [];
  const today = new Date();
  for (let i = f.days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const day = d.toISOString().slice(0, 10);
    const r = byDay.get(day);
    out.push({ day, direct: r?.direct ?? 0, embed: r?.embed ?? 0 });
  }
  return out;
}

export interface BreakdownRow {
  key: string;
  label: string;
  plays: number;
  viewers: number;
  watchSeconds: number;
}

async function breakdown(
  f: StatsFilter,
  keyExpr: string,
  labelExpr: string,
  join: string,
  limit: number,
  extraWhere = "",
): Promise<BreakdownRow[]> {
  const s = scope(f);
  const rows = await query<{ k: string | null; label: string | null; plays: number; viewers: number; watch: number | null }>(
    `SELECT ${keyExpr} AS k, ${labelExpr} AS label, COUNT(*) AS plays,
            COUNT(DISTINCT p.viewer_id) AS viewers, SUM(p.watch_seconds) AS watch
     FROM plays p ${join}
     WHERE ${s.where} ${extraWhere}
     GROUP BY k ORDER BY plays DESC, watch DESC LIMIT ?`,
    [...s.args, limit],
  );
  return rows.map((r) => ({
    key: String(r.k ?? ""),
    label: String(r.label ?? ""),
    plays: r.plays,
    viewers: r.viewers,
    watchSeconds: r.watch ?? 0,
  }));
}

export const getTopTitles = (f: StatsFilter, limit = 8) =>
  breakdown(f, "p.title_id", "COALESCE(t.title, '(deleted title)')", "LEFT JOIN titles t ON t.id = p.title_id", limit);

export const getTopPartners = (f: StatsFilter, limit = 8) =>
  breakdown(
    f,
    "p.partner_id",
    "COALESCE(pa.name, '(deleted partner)')",
    "LEFT JOIN partners pa ON pa.id = p.partner_id",
    limit,
    "AND p.partner_id IS NOT NULL",
  );

export const getTopDomains = (f: StatsFilter, limit = 8) =>
  breakdown(f, "COALESCE(p.domain, '')", "COALESCE(p.domain, '')", "", limit, "AND p.partner_id IS NOT NULL");

export const getCountries = (f: StatsFilter, limit = 8) =>
  breakdown(f, "COALESCE(p.country, '')", "COALESCE(p.country, '')", "", limit);

export const getDevices = (f: StatsFilter) => breakdown(f, "p.device", "p.device", "", 6);

export interface RecentPlay {
  id: string;
  startedAt: number;
  lastSeenAt: number;
  title: string;
  partner: string | null;
  domain: string | null;
  country: string | null;
  device: string;
  watchSeconds: number;
  completed: boolean;
  live: boolean;
}

export async function getRecentPlays(f: StatsFilter, limit = 15): Promise<RecentPlay[]> {
  const s = scope(f);
  const rows = await query<{
    id: string; started_at: number; last_seen_at: number; title: string | null; partner: string | null;
    partner_id: string | null; domain: string | null; country: string | null; device: string;
    watch_seconds: number; completed: number;
  }>(
    `SELECT p.id, p.started_at, p.last_seen_at, t.title AS title, pa.name AS partner, p.partner_id,
            p.domain, p.country, p.device, p.watch_seconds, p.completed
     FROM plays p
     LEFT JOIN titles t ON t.id = p.title_id
     LEFT JOIN partners pa ON pa.id = p.partner_id
     WHERE ${s.where} ORDER BY p.started_at DESC LIMIT ?`,
    [...s.args, limit],
  );
  const liveAfter = nowSec() - LIVE_WINDOW_SEC;
  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    lastSeenAt: r.last_seen_at,
    title: r.title ?? "(deleted title)",
    partner: r.partner_id ? (r.partner ?? "(deleted partner)") : null,
    domain: r.domain,
    country: r.country,
    device: r.device,
    watchSeconds: r.watch_seconds,
    completed: r.completed === 1,
    live: r.last_seen_at >= liveAfter,
  }));
}

/** Per-partner totals for the partners list. */
export async function getPartnerTotals(days: number): Promise<Map<string, { plays: number; viewers: number; watchSeconds: number; live: number }>> {
  const now = nowSec();
  const rows = await query<{ partner_id: string; plays: number; viewers: number; watch: number | null; live: number | null }>(
    `SELECT p.partner_id, COUNT(*) AS plays, COUNT(DISTINCT p.viewer_id) AS viewers,
            SUM(p.watch_seconds) AS watch,
            SUM(CASE WHEN p.last_seen_at >= ? THEN 1 ELSE 0 END) AS live
     FROM plays p WHERE p.partner_id IS NOT NULL AND p.started_at >= ?
     GROUP BY p.partner_id`,
    [now - LIVE_WINDOW_SEC, now - days * 86400],
  );
  return new Map(
    rows.map((r) => [r.partner_id, { plays: r.plays, viewers: r.viewers, watchSeconds: r.watch ?? 0, live: r.live ?? 0 }]),
  );
}

/** Lifetime play counts per title, for the admin titles list. */
export async function getTitlePlayCounts(): Promise<Map<string, number>> {
  const rows = await query<{ title_id: string; n: number }>("SELECT title_id, COUNT(*) AS n FROM plays GROUP BY title_id");
  return new Map(rows.map((r) => [r.title_id, r.n]));
}

import { query, run, nowSec } from "./db";
import { getActiveStreamPatterns } from "./hosted-player";
import { getExtraServerPatterns } from "./local-servers";
import { buildStreamSrc, buildTvStreamSrc } from "./stream";
import { CATEGORIES, TV_CATEGORIES, listCategory, listTv, tmdbEnabled, type Category, type TvCategory } from "./tmdb";

// Background sync with the linked stream provider (Nxsha, under agreement).
// Each run walks the TMDB catalogues (movies and series), asks the provider whether it can play each
// title (its embed page answers 404 when it can't) and records the answer in `stream_links`.
// The site then shows a Play button only for linked titles. Re-checks go stalest-first and stay polite:
// a small pool of requests with a pause between them.
//
// Extra embed servers (local-servers.ts) are checked the same way, each on its own. Not every server answers
// 404 for a missing title (many return 200 for anything), so each one is CALIBRATED first: a known-good id must
// answer OK and a made-up id must answer 404, otherwise that server is left alone (its button always shows).

const UA = "CineMirror/1.0 (stream availability sync)";
const PAGES_PER_LIST = Number(process.env.STREAM_SYNC_PAGES) || 5; // 20 titles per page
const CONCURRENCY = 3;
const PAUSE_MS = 250;
const RECHECK_AFTER_SEC = 24 * 3600;

type Kind = "movie" | "tv";
interface Candidate { kind: Kind; id: number; title: string }

export interface SyncResult {
  ran: boolean;
  reason?: string;
  checked: number;
  linked: number;
  unavailable: number;
  errors: number;
  ms: number;
  /** Per server: its own counts, or why it was skipped ("not checkable"). */
  servers?: Record<string, { checked: number; linked: number; unavailable: number; errors: number; skipped?: string }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function collect(): Promise<Candidate[]> {
  const seen = new Map<string, Candidate>();
  const add = (kind: Kind, id: number, title: string) => {
    const k = `${kind}:${id}`;
    if (!seen.has(k)) seen.set(k, { kind, id, title });
  };
  for (const cat of Object.keys(CATEGORIES) as Category[]) {
    for (let page = 1; page <= PAGES_PER_LIST; page++) {
      const list = await listCategory(cat, page).catch(() => []);
      if (!list.length) break;
      list.forEach((m) => add("movie", m.id, m.title));
    }
  }
  for (const cat of Object.keys(TV_CATEGORIES) as TvCategory[]) {
    for (let page = 1; page <= PAGES_PER_LIST; page++) {
      const list = await listTv(cat, page).catch(() => []);
      if (!list.length) break;
      list.forEach((s) => add("tv", s.id, s.name));
    }
  }
  return [...seen.values()];
}

/** true = playable, false = the provider has nothing for it, null = couldn't tell (network / 5xx). */
async function probe(url: string, timeoutMs = 15_000): Promise<boolean | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    await res.body?.cancel();
    if (res.ok) return true;
    if (res.status === 404 || res.status === 410) return false;
    return null;
  } catch {
    return null;
  }
}

let running = false;

interface Provider { id: string; movie: string | null; tv: string | null }

async function listProviders(): Promise<Provider[]> {
  const { movie, tv } = await getActiveStreamPatterns();
  const list: Provider[] = [];
  if (movie || tv) list.push({ id: "default", movie, tv });
  for (const s of await getExtraServerPatterns()) list.push({ id: s.id, movie: s.movie, tv: s.tv });
  return list;
}

// Ids used to calibrate a server: Fight Club / Game of Thrones exist everywhere; the made-up one exists nowhere.
const GOOD = { movie: 550, tv: 1399 };
const BOGUS = 999_999_999;

/** Which kinds the server's status code can be trusted for (good id -> OK, made-up id -> 404). */
async function calibrate(p: Provider): Promise<{ movie: boolean; tv: boolean }> {
  const trusted = async (good: string | null, bad: string | null) =>
    !!good && !!bad && (await probe(good)) === true && (await probe(bad)) === false;
  return {
    movie: !!p.movie && (await trusted(buildStreamSrc(p.movie, GOOD.movie), buildStreamSrc(p.movie, BOGUS))),
    tv: !!p.tv && (await trusted(buildTvStreamSrc(p.tv, GOOD.tv, 1, 1), buildTvStreamSrc(p.tv, BOGUS, 1, 1))),
  };
}

async function knownChecks(p: Provider): Promise<Map<string, number>> {
  const rows = p.id === "default"
    ? await query<{ kind: string; tmdb_id: number; checked_at: number }>("SELECT kind, tmdb_id, checked_at FROM stream_links")
    : await query<{ kind: string; tmdb_id: number; checked_at: number }>(
        "SELECT kind, tmdb_id, checked_at FROM server_links WHERE server_id = ?", [p.id]);
  return new Map(rows.map((r) => [`${r.kind}:${r.tmdb_id}`, r.checked_at]));
}

async function saveCheck(p: Provider, c: Candidate, ok: boolean) {
  if (p.id === "default") {
    await run(
      `INSERT INTO stream_links (kind, tmdb_id, title, available, checked_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(kind, tmdb_id) DO UPDATE SET title = excluded.title, available = excluded.available, checked_at = excluded.checked_at`,
      [c.kind, c.id, c.title, ok ? 1 : 0, nowSec()],
    );
  } else {
    await run(
      `INSERT INTO server_links (server_id, kind, tmdb_id, title, available, checked_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(server_id, kind, tmdb_id) DO UPDATE SET title = excluded.title, available = excluded.available, checked_at = excluded.checked_at`,
      [p.id, c.kind, c.id, c.title, ok ? 1 : 0, nowSec()],
    );
  }
}

export async function syncStreamLinks(): Promise<SyncResult> {
  const started = Date.now();
  const result: SyncResult = { ran: false, checked: 0, linked: 0, unavailable: 0, errors: 0, ms: 0, servers: {} };
  const providers = await listProviders();
  if (!providers.length) return { ...result, reason: "STREAM_EMBED_URL / STREAM_EMBED_TV_URL not set" };
  if (!tmdbEnabled()) return { ...result, reason: "TMDB_API_KEY not set" };
  if (running) return { ...result, reason: "already running" };
  running = true;
  try {
    const catalogue = await collect();
    const cutoff = nowSec() - RECHECK_AFTER_SEC;

    for (const p of providers) {
      const stats = { checked: 0, linked: 0, unavailable: 0, errors: 0 } as NonNullable<SyncResult["servers"]>[string];
      result.servers![p.id] = stats;
      const trusted = await calibrate(p);
      if (!trusted.movie && !trusted.tv) {
        stats.skipped = "not checkable (does not answer 404 for unknown titles) - always shown";
        continue;
      }
      const known = await knownChecks(p);
      const todo = catalogue
        .filter((c) => trusted[c.kind])
        .filter((c) => (known.get(`${c.kind}:${c.id}`) ?? 0) < cutoff)
        .sort((a, b) => (known.get(`${a.kind}:${a.id}`) ?? 0) - (known.get(`${b.kind}:${b.id}`) ?? 0));

      let next = 0;
      const worker = async () => {
        while (next < todo.length) {
          const c = todo[next++];
          // A series is linked when its first episode plays; the player resolves the rest by season/episode.
          const url = c.kind === "movie" ? buildStreamSrc(p.movie!, c.id) : buildTvStreamSrc(p.tv!, c.id, 1, 1);
          if (!url) continue;
          const ok = await probe(url);
          stats.checked++;
          if (ok === null) {
            stats.errors++;
          } else {
            if (ok) stats.linked++; else stats.unavailable++;
            await saveCheck(p, c, ok);
          }
          await sleep(PAUSE_MS);
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      result.checked += stats.checked;
      result.linked += stats.linked;
      result.unavailable += stats.unavailable;
      result.errors += stats.errors;
    }
    result.ran = true;
  } finally {
    running = false;
    result.ms = Date.now() - started;
  }
  return result;
}

/**
 * Check specific titles against the default provider right now (used when a page lists titles the background sync
 * hasn't reached yet, e.g. search results). Short timeout, small pool; results land in stream_links like a sync run.
 */
export async function checkNow(items: { kind: Kind; id: number; title: string }[]): Promise<void> {
  if (!items.length) return;
  const { movie, tv } = await getActiveStreamPatterns();
  const provider: Provider = { id: "default", movie, tv };
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const c = items[next++];
      const url = c.kind === "movie" ? (movie ? buildStreamSrc(movie, c.id) : null) : tv ? buildTvStreamSrc(tv, c.id, 1, 1) : null;
      if (!url) continue;
      const ok = await probe(url, 5_000);
      if (ok !== null) await saveCheck(provider, c, ok);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}

/** Start the recurring sync once per server process. First run shortly after boot, then every interval. */
export function startStreamSyncWorker(): void {
  const g = globalThis as unknown as { __streamSyncTimer?: ReturnType<typeof setInterval> };
  if (g.__streamSyncTimer || process.env.STREAM_SYNC === "off") return;
  const hours = Number(process.env.STREAM_SYNC_HOURS) || 6;
  const tick = () =>
    syncStreamLinks()
      .then((r) => console.log(`[stream-sync] ${r.ran ? "done" : "skipped"}${r.reason ? ` (${r.reason})` : ""}: ${JSON.stringify(r)}`))
      .catch((err) => console.error("[stream-sync] failed:", err));
  setTimeout(tick, 15_000).unref?.();
  g.__streamSyncTimer = setInterval(tick, hours * 3600_000);
  g.__streamSyncTimer.unref?.();
}

export type LinkState = "linked" | "unavailable" | "unknown";

/** Links known to the sync, keyed "kind:id". Used by pages to decide what to show. */
export async function linkIndex(): Promise<(kind: Kind, id: number) => LinkState> {
  const rows = await query<{ kind: string; tmdb_id: number; available: number }>(
    "SELECT kind, tmdb_id, available FROM stream_links",
  );
  const map = new Map(rows.map((r) => [`${r.kind}:${r.tmdb_id}`, r.available === 1]));
  return (kind, id) => {
    const v = map.get(`${kind}:${id}`);
    return v === undefined ? "unknown" : v ? "linked" : "unavailable";
  };
}

/** Per extra server, what the sync found out: (serverId, kind, id) -> linked / unavailable / unknown. */
export async function serverLinkIndex(): Promise<(serverId: string, kind: Kind, id: number) => LinkState> {
  const rows = await query<{ server_id: string; kind: string; tmdb_id: number; available: number }>(
    "SELECT server_id, kind, tmdb_id, available FROM server_links",
  );
  const map = new Map(rows.map((r) => [`${r.server_id}:${r.kind}:${r.tmdb_id}`, r.available === 1]));
  return (serverId, kind, id) => {
    const v = map.get(`${serverId}:${kind}:${id}`);
    return v === undefined ? "unknown" : v ? "linked" : "unavailable";
  };
}
